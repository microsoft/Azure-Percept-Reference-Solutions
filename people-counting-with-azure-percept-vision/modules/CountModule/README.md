# Edge Deployment
Use this information to deploy people counting modules on your edge device

## Contents 

| File             | Description                                                   |
|-------------------------|---------------------------------------------------------------|
| `readme.md`             | This readme file                                              |
| `Dockerfile.arm64v8`    | The Dockerfile of the people counting module                       |
| `main.py`               | The main program file                                         |
| `module.json`           | The config of the people counting module                           |
| `requirement.txt`       | List of all dependent Python libraries                        |

## Setup for edge

1. Fill your ACR address in module.json file (ex: dk361d.azurecr.io/pplcount)
```
   "repository": "<Your container registry login server/respository name>"
```
2. Build and push your IoT Edge solutions to your private ACR 
Use VSCode as in [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11#build-and-push-your-solution) to build and push your solutions

3. Deploy edge modules to device
Use VSCode as in [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11#deploy-modules-to-device) to deploy the modules to the Percept DK with the above files.


### Credits and references
- [Tutorial: Develop IoT Edge modules with Linux containers](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11)
