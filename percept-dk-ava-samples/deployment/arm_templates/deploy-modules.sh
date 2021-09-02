#!/usr/bin/env bash

#######################################################################################################
# This script is designed for use as a deployment script in a template
# https://docs.microsoft.com/en-us/azure/azure-resource-manager/templates/deployment-script-template
#
# It expects the following environment variables
# $DEPLOYMENT_MANIFEST_TEMPLATE_URL - the location of a template of an IoT Edge deployment manifest
# $PROVISIONING_TOKEN               - the token used for provisioing the edge module
# $HUB_NAME                         - the name of the IoT Hub where the edge device is registered
# $DEVICE_ID                        - the name of the edge device on the IoT Hub
# $VIDEO_OUTPUT_FOLDER_ON_DEVICE    - the folder where the file sink will store clips
# $VIDEO_INPUT_FOLDER_ON_DEVICE     - the folder where where rtspsim will look for sample clips
# $APPDATA_FOLDER_ON_DEVICE         - the folder where Video Analyzer module will store state
# $AZURE_STORAGE_ACCOUNT            - the storage where the deployment manifest will be stored
# $AZ_SCRIPTS_OUTPUT_PATH           - file to write output (provided by the deployment script runtime) 
# $RESOURCE_GROUP                   - the resouce group that you are deploying in to
# $REGESTRY_PASSWORD                - the password for the container registry
# $REGISTRY_USER_NAME               - the user name for the container registry
# $IOT_HUB_CONNECTION_STRING        - the IoT Hub connection string
# $IOT_EDGE_MODULE_NAME             - the IoT avaedge module name
#
#######################################################################################################

# automatically install any extensions
az config set extension.use_dynamic_install=yes_without_prompt

# Define helper function for logging
info() {
    echo "$(date +"%Y-%m-%d %T") [INFO]"
}

# Define helper function for logging. This will change the Error text color to red
error() {
    echo "$(date +"%Y-%m-%d %T") [ERROR]"
}

exitWithError() {
    exit 1
}

# download the deployment manifest file
echo "$(info) downloading $DEPLOYMENT_MANIFEST_TEMPLATE_URL\n"
curl -s $DEPLOYMENT_MANIFEST_TEMPLATE_URL > deployment.json

# update the values in the manifest
echo "$(info) replacing value in manifest\n"
sed -i "s@\$AVA_PROVISIONING_TOKEN@${PROVISIONING_TOKEN}@g" deployment.json
sed -i "s@\$VIDEO_OUTPUT_FOLDER_ON_DEVICE@${VIDEO_OUTPUT_FOLDER_ON_DEVICE}@g" deployment.json
sed -i "s@\$VIDEO_INPUT_FOLDER_ON_DEVICE@${VIDEO_INPUT_FOLDER_ON_DEVICE}@g" deployment.json
sed -i "s@\$APPDATA_FOLDER_ON_DEVICE@${APPDATA_FOLDER_ON_DEVICE}@g" deployment.json

# Add a file to build env.txt file from
>env.txt
echo "SUBSCRIPTION_ID=$SUBSCRIPTION_ID" >> env.txt
echo "RESOUCE_GROUP=$RESOURCE_GROUP" >> env.txt
echo "AVA_PROVISIONING_TOKEN=$PROVISIONING_TOKEN">> env.txt
echo "VIDEO_INPUT_FOLDER_ON_DEVICE=$VIDEO_INPUT_FOLDER_ON_DEVICE">> env.txt
echo "VIDEO_OUTPUT_FOLDER_ON_DEVICE=$VIDEO_OUTPUT_FOLDER_ON_DEVICE" >> env.txt
echo "APPDATA_FOLDER_ON_DEVICE=$APPDATA_FOLDER_ON_DEVICE" >> env.txt
echo "CONTAINER_REGISTRY_PASSWORD_myacr=$REGISTRY_PASSWORD" >> env.txt
echo "CONTAINER_REGISTRY_USERNAME_myacr=$REGISTRY_USER_NAME" >> env.txt
>appsettings.json
echo "{" >> appsettings.json
echo "\"IoThubConnectionString\": \"$IOT_HUB_CONNECTION_STRING\"," >> appsettings.json
echo "\"deviceId\": \"$DEVICE_ID\"," >> appsettings.json
echo "\"moduleId\": \"$IOT_EDGE_MODULE_NAME\"" >> appsettings.json
echo "}" >> appsettings.json

# deploy the manifest to the iot hub
echo "$(info) deploying manifest to $DEVICE_ID on $HUB_NAME\n"
az iot edge set-modules --device-id $DEVICE_ID --hub-name $HUB_NAME --content deployment.json --only-show-error -o table

# store the manifest for later reference
echo "$(info) storing manifest for reference\n"
az storage share create --name deployment-output --account-name $AZURE_STORAGE_ACCOUNT
az storage file upload --share-name deployment-output --source deployment.json --account-name $AZURE_STORAGE_ACCOUNT
az storage file upload --share-name deployment-output --source env.txt --account-name $AZURE_STORAGE_ACCOUNT
az storage file upload --share-name deployment-output --source appsettings.json --account-name $AZURE_STORAGE_ACCOUNT

# make sure device is running (block until) - checking up to 5min every 10s
DEVICE_RUNNING="Failed"
for ((i=1; i<=30; i++)); do
    if [ ! "$DEVICE_RUNNING" == "200" ]; then
        # shellcheck disable=2016
        DEVICE_RUNNING=$( az iot hub query -n "$HUB_NAME" -q "select properties.reported.azureDeviceUpdateAgent.client.resultCode from devices where devices.deviceId = '$DEVICE_ID'" --query "[].resultCode" --output tsv)
        sleep 10s
    fi
done

if [ ! "$DEVICE_RUNNING" == "200" ]; then
    echo "$(error) IoT Edge runtime is reporting running state. Please check IoT Edge runtime on Edge device"
    echo "$(error) Current IoT Edge Runtime Status is $DEVICE_RUNNING"
    exitWithError
fi

# make sure avaedge is running (block until) - checking up to 10min every 10s
MODULE_RUNNING="Failed"
for ((i=1; i<=60; i++)); do
    
    if [ ! "$MODULE_RUNNING" == "Running" ]; then
        MODULE_RUNNING=$( az iot hub query -n "$HUB_NAME" -q "select properties.reported.State from devices.modules where devices.modules.moduleId = 'avaedge' and devices.deviceId = '$DEVICE_ID'" | jq -r '.[].State')
        sleep 10s
    fi
done

if [ ! "$MODULE_RUNNING" == "Running" ]; then
    echo "$(error) AVA is not not running on Edge device. Please check IoT Edge runtime on Edge device"
    echo "$(error) Current AVA Edge Module Status is $MODULE_RUNNING"
    exitWithError
fi


# restart avaedge to update properties
echo "$(info) Restarting the avaedge module on edge device"
RESTART_MODULE=$(az iot hub invoke-module-method --method-name "RestartModule" -n "$HUB_NAME" -d "$DEVICE_ID" -m "\$edgeAgent" --method-payload \
'{"schemaVersion": "1.0","id": "avaedge"}')

if [ "$(echo "$RESTART_MODULE" | jq '.status')" == 200 ]; then
	echo "$(info) Restarted the avaedge module on edge device"
else
    echo "$(error) Failed to restart the avaedge module on edge device."
    echo "ERROR CODE: $(echo "$RESTART_MODULE" | jq '.payload.error.code')"
    echo "ERROR MESSAGE: $(echo "$RESTART_MODULE" | jq '.payload.error.message')"
    exitWithError
fi

# make sure avaedge is running again
MODULE_RUNNING="Failed" # reset
for ((i=1; i<=60; i++)); do
    
    if [ ! "$MODULE_RUNNING" == "Running" ]; then
        MODULE_RUNNING=$( az iot hub query -n "$HUB_NAME" -q "select properties.reported.State from devices.modules where devices.modules.moduleId = 'avaedge' and devices.deviceId = '$DEVICE_ID'" | jq -r '.[].State')
        sleep 10s
    fi
done

if [ ! "$MODULE_RUNNING" == "Running" ]; then
    echo "$(error) AVA is not not running on Edge device. Please check IoT Edge runtime on Edge device"
    echo "$(error) Current AVA Edge Module Status is $MODULE_RUNNING"
    exitWithError
fi

# set the CVR pipeline topology
echo "$(info) set the CVR topology pipeline\n"

wget https://raw.githubusercontent.com/Azure/video-analyzer/main/pipelines/live/topologies/cvr-video-sink/topology.json
wget https://raw.githubusercontent.com/michhar/counting-objects-with-azure-video-analyzer/main/deploy/arm_templates/live-pipeline-set.json

# set CVR pipeline topology
PIPELINE_TOPOLOGY_PAYLOAD=$(< topology.json)
printf "setting AVA pipeline topology"
az iot hub invoke-module-method \
    -n "$HUB_NAME" \
    -d "$DEVICE_ID" \
    -m avaedge \
    --mn pipelineTopologySet \
    --mp  "$PIPELINE_TOPOLOGY_PAYLOAD" \
	--timeout 120

# set the CVR live pipeline
LIVE_PIPELINE_SET_PAYLOAD=$(< live-pipeline-set.json)
echo "$(info) setting AVA live pipeline"
az iot hub invoke-module-method \
    -n "$HUB_NAME" \
    -d "$DEVICE_ID" \
    -m avaedge \
    --mn livePipelineSet \
    --mp "$LIVE_PIPELINE_SET_PAYLOAD" \
    --timeout 120

# activate the CVR live pipeline
LIVE_PIPELINE_ACTIVATE_PAYLOAD='{"@apiVersion": "1.0", "name": "CVR-Pipeline"}'
echo "$(info) activating AVA live pipeline"
ACTIVATE_RESPONSE=$(az iot hub invoke-module-method \
    -n "$HUB_NAME" \
    -d "$DEVICE_ID" \
    -m avaedge \
    --mn livePipelineActivate \
    --mp "$LIVE_PIPELINE_ACTIVATE_PAYLOAD")

echo $ACTIVATE_RESPONSE