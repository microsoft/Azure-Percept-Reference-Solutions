# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import os
import asyncio
from six.moves import input
import threading
from azure.iot.device.aio import IoTHubModuleClient
from azure.iot.device import MethodResponse, Message
import json
from datetime import datetime
from datetime import datetime, timezone


async def main():
    # The client object is used to interact with your Azure IoT hub.
    module_client = IoTHubModuleClient.create_from_edge_environment()

    # connect the client.
    await module_client.connect()

    # event indicating when user is finished
    finished = threading.Event()

    # Define behavior for receiving an input message on input1 and input2
    # NOTE: this could be a coroutine or a function
    async def message_handler(input_message):
        if input_message.input_name == "CountInput":
            now = datetime.now()
            print(f'{now} The data in the message received on azureeyemodule was {input_message.data}')
            print(f'{now} Custom properties are {input_message.custom_properties})')

            inference_list = json.loads(input_message.data)['NEURAL_NETWORK']
            print(f'inference list: {inference_list}')
            count_ppl = 0 
            
            if isinstance(inference_list, list) and inference_list:
                now = datetime.fromtimestamp(int(inference_list[0]['timestamp'][:-9]))
                
                count_ppl = len(inference_list)
            
            print(f'People_Count: {count_ppl}')
            print(f'Date: {now}')

            json_data = {
                    'Date': f'{now}', 
                    'People_Count': count_ppl
                }
            
            print("forwarding mesage to output1")
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