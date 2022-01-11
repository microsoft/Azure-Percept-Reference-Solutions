# Edge Deployment
Use this information to deploy evaluate modules on your edge device

## Contents 

| File             | Description                                                   |
|-------------------------|---------------------------------------------------------------|
| `readme.md`             | This readme file                                              |
| `Dockerfile.arm64v8`    | The Dockerfile of the evaluate module                       |
| `main.py`               | The main program file                                         |
| `module.json`           | The config of the evaluate module                           |
| `requirement.txt`       | List of all dependent Python libraries                        |

## Setup for edge

1. Fill your ACR address in module.json file
```
   "repository": "<Your container registry login server/respository name>"
```

2. Change the Azure IoT Edge Solution Default Platform to `arm64v8` as in [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11#select-your-target-architecture)
   
3. Build and push your IoT Edge solutions to your private ACR 
Use VSCode as in [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11#build-and-push-your-solution) to build and push your solutions

4. Deploy edge modules to device
Use VSCode as in [here](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11#deploy-modules-to-device) to deploy the modules to the Percept DK with the above files.


### Credits and references
- [Tutorial: Develop IoT Edge modules with Linux containers](https://docs.microsoft.com/en-us/azure/iot-edge/tutorial-develop-for-linux?view=iotedge-2020-11)
