# AI Application Topology and IoT Container Access

This reference application hosts an open source SSD-MobileNet based AI model which has been trained in people detection using the Microsoft COCO dataset: https://cocodataset.org/

It has the following overall topology consisting of two primary Azure IoT Edge containers running within the Santa Cruz device, connected to several Azure cloud components:

![](/docs/images/AI-App-Topology.PNG)

You can view the details on these two containers by visting the IoT Hub which was deployed as a part of this application.  Choose `IoT Edge` in the left rail under `Automatic Device Management`.  Once selected, you'll see your `azureEyeEdgeDevice` in the main portal window:

![](/docs/images/IoT-Hub-Edge.png)
#
Once you click on the `azureEyeEdgeDevice`,  you will see the page below. Click on the `camerastream` container at the bottom:

![](/docs/images/IoT-Hub-Containers.png)
#
This will bring up the details on the `camerastream` container. Click on the `Module Identity Twin` at the top:

![](/docs/images/IoT-Hub-Identity-Twin.png)


#

You will then see the live configuration of the IoT Edge container in the device:

![](/docs/images/IoT-Hub-Identity-Twin-Details.png)
#
You can edit this configuration and the changes will be reflected in the device. For example, if you wished to use your own prerecorded video in the application, you can edit the `rtsp` field and change the `/camera-stream/video/sample-video.mp4` with your own video path which you previously placed on the device.  If you wished to change the frame rate of the AI inferencing, change the `interval` from 0.2 (5 frames per second) to a different value.

Press `Save` and any changes will be automatically synchronized to the physical or virtual Eye devices.