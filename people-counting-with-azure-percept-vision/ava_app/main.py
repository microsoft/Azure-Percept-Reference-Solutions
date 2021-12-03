import json
from os import path
import pathlib
import logging
import argparse
from builtins import input
import ssl
import urllib.request
from azure.iot.hub import IoTHubRegistryManager
from azure.iot.hub.models import CloudToDeviceMethod, CloudToDeviceMethodResult

def read_url(url):
    url = url.replace(path.sep, '/')
    resp = urllib.request.urlopen(url, context=ssl._create_unverified_context())
    return resp.read()

class LivePipelineManager:
    
    def __init__(self):
        config_data = pathlib.Path('appsettings.json').read_text()
        config = json.loads(config_data)

        self.device_id = config['deviceId']
        self.module_id = config['moduleId']
        self.api_version = '1.0'

        self.registry_manager = IoTHubRegistryManager(config['IoThubConnectionString'])

    def invoke(self, method_name, payload):
        if method_name=='pipelineTopologySet':
            self.pipeline_topology_set(payload)
            return

        if method_name=='WaitForInput':
            print(payload['message'])
            input()
            return

        self.invoke_module_method(method_name, payload)

    def invoke_module_method(self, method_name, payload):
        # make sure '@apiVersion' has been set
        payload['@apiVersion'] = self.api_version

        module_method = CloudToDeviceMethod(
            method_name=method_name,
            payload=payload,
            response_timeout_in_seconds=30)
        
        print("\n-----------------------  Request: %s  --------------------------------------------------\n" % method_name)
        print(json.dumps(payload, indent=4))
        
        resp = self.registry_manager.invoke_device_module_method(self.device_id, self.module_id, module_method)
        
        print("\n---------------  Response: %s - Status: %s  ---------------\n" % (method_name, resp.status))

        if resp.payload is not None:
            print(json.dumps(resp.payload, indent=4))

    def pipeline_topology_set(self, op_parameters):
        if op_parameters is None:
            raise Exception('Operation parameters missing')

        if op_parameters.get('pipelineTopologyUrl') is not None:
            topology_json = read_url(op_parameters['pipelineTopologyUrl'])
        elif op_parameters.get('pipelineTopologyFile') is not None:
            topology_path = pathlib.Path(__file__).parent.joinpath(op_parameters['pipelineTopologyFile'])
            topology_json = topology_path.read_text()
        else:
            raise Exception('Neither pipelineTopologyUrl nor pipelineTopologyFile is specified')

        topology = json.loads(topology_json)

        self.invoke_module_method('pipelineTopologySet', topology)


if __name__ == '__main__':
    manager = LivePipelineManager()

    parser = argparse.ArgumentParser()
    parser.add_argument('--action', default='start',
                        help='--action must be "start" or "stop" to start AVA or stop AVA, respectively.')
    parser.add_argument('--type', default='cvr',
                        help='--type must be "cvr" or "http" to use the cvr or http pipelines and topologies, respectively.')

    args = parser.parse_args()
    
    if args.action == 'start' and args.type == 'http':
        operations_data_json = pathlib.Path('operations_start_http.json').read_text()
    elif args.action == 'stop' and args.type == 'http':
        operations_data_json = pathlib.Path('operations_delete_http.json').read_text()
    elif args.action == 'start' and args.type == 'cvr':
        operations_data_json = pathlib.Path('operations_start_cvr.json').read_text()
    elif args.action == 'stop' and args.type == 'cvr':
        operations_data_json = pathlib.Path('operations_delete_cvr.json').read_text()
    else:
        print('action and/or type value not recognized. --action must be "start" or "stop" to start AVA or stop AVA, respectively and --type must be "cvr" or "http"')
        exit(-1)

    operations_data = json.loads(operations_data_json)

    for operation in operations_data['operations']:
        manager.invoke(operation['opName'], operation['opParams'])