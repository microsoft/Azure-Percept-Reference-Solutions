# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import OperationStatusCodes
from azure.cognitiveservices.vision.computervision.models import VisualFeatureTypes
from msrest.authentication import CognitiveServicesCredentials

from array import array
import os
from PIL import Image
import sys
import time
import os
import asyncio
from six.moves import input
import threading
from azure.iot.device.aio import IoTHubModuleClient
from azure.iot.device import MethodResponse, Message
import json
from datetime import datetime
from datetime import datetime, timezone
from subprocess import run

RTSP_PROTOCOL = 'udp'
RTSP_IP = 'azureeyemodule'
RTSP_PORT = '8554'
RTSP_PATH = 'result'
IMAGE_PATH = './'
IMAGE_NAME = 'computer_vision_ocr.png'
SUBSCRIPTION_KEY = '<Your custom vision sub key>'
COMPUTERVISION_LOCATION = "<Your custom vision region>"
IMAGES_FOLDER = './'
DEFINED_OBJECT = 'book'

def image_capture():
    
    ffmpeg_command = f'ffmpeg -rtsp_transport {RTSP_PROTOCOL} -loglevel error -timeout 2000000 -y -i rtsp://{RTSP_IP}:{RTSP_PORT}/{RTSP_PATH} -vframes 1 -strftime 1 {IMAGE_PATH}{IMAGE_NAME}'
    print(f'Running: ffmpeg ${ffmpeg_command}')                       
    ffmpeg_command_arr = ffmpeg_command.split(' ')
    print(ffmpeg_command_arr)
    process = run(ffmpeg_command_arr)                       
    code = process.returncode

    return code


def recognize_text_in_stream(client):
    
    print("===== Read Image =====")
    with open(os.path.join(IMAGES_FOLDER, "computer_vision_ocr.png"), "rb") as image_stream:
        image_analysis = client.recognize_printed_text_in_stream(
            image=image_stream,
            language="en"
        )
  
    if len(image_analysis.regions) > 0:
        lines = image_analysis.regions[0].lines
        print("Recognized:\n")
        for line in lines:
            line_text = " ".join([word.text for word in line.words])
            print(line_text)
    else:
        print("Not Recognized")
    
    return line_text

async def main():
    # The client object is used to interact with your Azure IoT hub.
    module_client = IoTHubModuleClient.create_from_edge_environment()
    client = ComputerVisionClient(
                endpoint="https://" + COMPUTERVISION_LOCATION + ".api.cognitive.microsoft.com/",
                credentials=CognitiveServicesCredentials(SUBSCRIPTION_KEY)
            )
    # connect the client.
    await module_client.connect()

    # event indicating when user is finished
    finished = threading.Event()

    # Define behavior for receiving an input message on input1 and input2
    # NOTE: this could be a coroutine or a function
    async def message_handler(input_message):
        if input_message.input_name == "Input":    
            line_text = ''
            now = datetime.now()
            print('======================================START========================================')
            print(f'{now} The data in the message received on azureeyemodule was {input_message.data}')
            print(f'{now} Custom properties are {input_message.custom_properties})')

            inference_list = json.loads(input_message.data)['NEURAL_NETWORK']
            print(f'inference list: {inference_list}')

            if isinstance(inference_list, list) and inference_list:
                for inference_item in inference_list:
                    object_label =inference_item['label']
                    print(f'{object_label} detected')
                    if object_label != DEFINED_OBJECT:
                        continue

                    elif object_label == DEFINED_OBJECT:    
                        now = datetime.fromtimestamp(int(inference_item['timestamp'][:-9]))
                        code = image_capture()
                        if code == 0:
                            print("ffmpeg command success")
                            line_text = recognize_text_in_stream(client) 
                        else:
                            print("invalid result: ffmpeg command fail")
            
            json_data = {
                    'Date': f'{now}', 
                    'OCR_TEXT': f'{line_text}'
                }
            
            print("forwarding mesage to output1")
            print('====================================END========================================')
            msg = Message(json.dumps(json_data))
            msg.content_encoding = "utf-8"
            msg.content_type = "application/json"
            await module_client.send_message_to_output(msg, "output1")

        else:
            print("message received on unknown input")

    # Define behavior for receiving a twin desired properties patch
    # NOTE: this could be a coroutine or function
    def twin_patch_handler(patch):
        print("the data in the desired properties patch was: {}".format(patch))

    # Define behavior for receiving methods
    async def method_handler(method_request):
        print("Unknown method request received: {}".format(method_request.name))
        method_response = MethodResponse.create_from_method_request(method_request, 400, None)
        await module_client.send_method_response(method_response)

    # set the received data handlers on the client
    module_client.on_message_received = message_handler
    module_client.on_twin_desired_properties_patch_received = twin_patch_handler
    module_client.on_method_request_received = method_handler

    

    # This will trigger when a Direct Method Request for "shutdown" is sent.
    # NOTE: This sample will NOT exit until a Direct Method Request is sent.
    # Send one using the Azure IoT Explorer or the Azure IoT CLI
    # (https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods)
    finished.wait()
    # Once it is received, shut down the client
    await module_client.shutdown()


if __name__ == "__main__":
    asyncio.run(main())

    # If using Python 3.6 or below, use the following code instead of asyncio.run(main()):
    # loop = asyncio.get_event_loop()
    # loop.run_until_complete(main())
    # loop.close()