# -------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See License.txt in the project root for
# license information.
# --------------------------------------------------------------------------
import os
import asyncio
from typing import Collection
from six.moves import input
import threading
from azure.iot.device.aio import IoTHubModuleClient
from azure.iot.device import MethodResponse, Message
import json
from datetime import datetime
from datetime import datetime, timezone, timedelta
import random
import os
import asyncio
from azure.iot.device.aio import IoTHubDeviceClient
from azure.iot.device import Message, MethodResponse

async def main():
    # The client object is used to interact with your Azure IoT hub.
    module_client = IoTHubModuleClient.create_from_edge_environment()

    first_timestamp = 0
    last_timestamp = 0
    duration = 0

    old_detect = False
    new_detect = False


    # connect the client.
    await module_client.connect()

    # event indicating when user is finished
    finished = threading.Event()

    # Define behavior for receiving an input message on input1 and input2
    # NOTE: this could be a coroutine or a function
    async def message_handler(input_message):
        nonlocal first_timestamp
        nonlocal last_timestamp
        nonlocal old_detect
        nonlocal new_detect
        nonlocal duration

        if input_message.input_name == 'ObjectInput':
            now = datetime.now()

            print(f'{now} The data in the message received on azureeyemodule was {input_message.data}')
            print(f'{now} Custom properties are {input_message.custom_properties})')

            inference_list = json.loads(input_message.data)['NEURAL_NETWORK']

            print(f'inference list: {inference_list}')
            
            if not isinstance(inference_list, list) or not inference_list:
                new_detect = False
            else:
                new_detect = True

            
            if not old_detect and new_detect:
                first_timestamp = now
                print(f'first_timestamp: {first_timestamp}')

            if old_detect and not new_detect:
                last_timestamp = now
                duration = last_timestamp - first_timestamp
                print("-----transaction-----")
                print(f'first_timestamp: {first_timestamp}')
                print(f'last_timestamp: {last_timestamp}')
                print(f'duration: {duration}')
                print("---------------------")
                json_data = {
                    'Date': f'{now}',
                    'Duration': f'{duration}'
                }
            
                print('forwarding mesage to output1')
                msg = Message(json.dumps(json_data))
                msg.content_encoding = 'utf-8'
                msg.content_type = 'application/json'
                await module_client.send_message_to_output(msg, 'output1')

            old_detect = new_detect
         
        else:
            print('message received on unknown input')

    # Define behavior for receiving a twin desired properties patch
    # NOTE: this could be a coroutine or function
    def twin_patch_handler(patch):
        print('the data in the desired properties patch was: {}'.format(patch))


    # set the received data handlers on the client
    module_client.on_message_received = message_handler
    module_client.on_twin_desired_properties_patch_received = twin_patch_handler

    # This will trigger when a Direct Method Request for 'shutdown' is sent.
    # NOTE: This sample will NOT exit until a Direct Method Request is sent.
    # Send one using the Azure IoT Explorer or the Azure IoT CLI
    # (https://docs.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-direct-methods)
    finished.wait()
    # Once it is received, shut down the client
    await module_client.shutdown()


if __name__ == '__main__':
    asyncio.run(main())

    # If using Python 3.6 or below, use the following code instead of asyncio.run(main()):
    # loop = asyncio.get_event_loop()
    # loop.run_until_complete(main())
    # loop.close()