#!/bin/bash

# This script generates a deployment manifest template and deploys it to an existing IoT Edge device

echo "Logging in with Managed Identity"
az login --identity --output "none"

# Define helper function for logging
info() {
    echo "$(date +"%Y-%m-%d %T") [INFO]"
}

# Define helper function for logging. This will change the Error text color to red
error() {
    echo "$(date +"%Y-%m-%d %T") [ERROR]"
}

exitWithError() {
    # Reset console color
    exit 1
}

SAS_URL="https://unifiededgescenarios.blob.core.windows.net/arm-template/azure-percept/latest/azurepercept-bundle.zip"


echo "Downloading manifest bundle zip"

# Download the latest manifest-bundle.zip from storage account
wget -O manifest-bundle.zip "$SAS_URL"

# Extracts all the files from zip in curent directory;
# overwrite existing ones
echo "Unzipping the files"
unzip -o manifest-bundle.zip -d "manifest-bundle"
cd manifest-bundle

echo "Unzipped the files in directory manifest-bundle"


echo "Installing packages"
pip install --upgrade requests
echo "Installing iotedgedev"
pip install iotedgedev==2.1.4

echo "Updating az-cli"
pip install --upgrade azure-cli
pip install --upgrade azure-cli-telemetry

echo "installing azure iot extension"
az extension add --name azure-iot

echo "installing sshpass, coreutils and jsonschema"
pip3 install --upgrade jsonschema
apk add coreutils
apk add sshpass

echo "package installation is complete"

# We're enabling exit on error after installation steps as there are some warnings and error thrown in installation steps which causes the script to fail
set -e

# Check for existence of IoT Hub and Edge device in Resource Group for IoT Hub,
# and based on that either throw error or use the existing resources
if [ -z "$(az iot hub list --query "[?name=='$IOTHUB_NAME'].name" --resource-group "$RESOURCE_GROUP_DEVICE" -o tsv)" ]; then
    echo "$(error) IoT Hub \"$IOTHUB_NAME\" does not exist."
    exitWithError
else
    echo "$(info) Using existing IoT Hub \"$IOTHUB_NAME\""
fi

echo "$(info) Retrieving IoT Hub connection string"
IOTHUB_CONNECTION_STRING="$(az iot hub connection-string show --hub-name "$IOTHUB_NAME" --query "connectionString" --output tsv)"

if [ -z "$(az iot hub device-identity list --hub-name "$IOTHUB_NAME" --resource-group "$RESOURCE_GROUP_DEVICE" --query "[?deviceId=='$DEVICE_NAME'].deviceId" -o tsv)" ]; then
    echo "$(error) Device \"$DEVICE_NAME\" does not exist in IoT Hub \"$IOTHUB_NAME\""
    exitWithError
else
    echo "$(info) Using existing Edge Device \"$DEVICE_NAME\""
fi

echo "$(info) Retrieving Edge Device connection string"
EDGE_DEVICE_CONNECTION_STRING=$(az iot hub device-identity connection-string show --device-id "$DEVICE_NAME" --hub-name "$IOTHUB_NAME" --query "connectionString" -o tsv)

MANIFEST_TEMPLATE_NAME="lva.template.json"
MANIFEST_ENVIRONMENT_VARIABLES_FILENAME='.env'

echo "$(info) Updating variable values in environment file"
# Update the value of RUNTIME variable in environment variable file
sed -i 's#^\(AAD_SERVICE_PRINCIPAL_ID[ ]*=\).*#\1\"'"$SP_APP_ID"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(AAD_SERVICE_PRINCIPAL_SECRET[ ]*=\).*#\1\"'"$SP_APP_PWD"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(AAD_TENANT_ID[ ]*=\).*#\1\"'"$TENANT_ID"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(SUBSCRIPTION_ID[ ]*=\).*#\1\"'"$SUBSCRIPTION_ID"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(AMS_ACCOUNT[ ]*=\).*#\1\"'"$AMS_ACCOUNT_NAME"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(RESOURCE_GROUP[ ]*=\).*#\1\"'"$RESOURCE_GROUP_AMS"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(IOT_DEVICE_ID[ ]*=\).*#\1\"'"$DEVICE_NAME"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(IOT_HUB_CONN_STRING[ ]*=\).*#\1\"'"$IOTHUB_CONNECTION_STRING"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"
sed -i 's#^\(IOT_EDGE_DEVICE_CONN_STRING[ ]*=\).*#\1\"'"$EDGE_DEVICE_CONNECTION_STRING"'\"#g' "$MANIFEST_ENVIRONMENT_VARIABLES_FILENAME"


echo "$(info) Generating manifest file from template file"
# Generate manifest file
iotedgedev genconfig --file "$MANIFEST_TEMPLATE_NAME"

echo "$(info) Generated manifest file"

#Construct file path of the manifest file by getting file name of template file and replace 'template.' with '' if it has .json extension
#iotedgedev service used deployment.json filename if the provided file does not have .json extension
#We are prefixing ./config to the filename as iotedgedev service creates a config folder and adds the manifest file in that folder

# if .json then remove template. if present else deployment.json
if [[ "$MANIFEST_TEMPLATE_NAME" == *".json"* ]]; then
    # Check if the file name is like name.template.json, if it is construct new name as name.json
    # Remove last part (.json) from file name
    TEMPLATE_FILE_NAME="${MANIFEST_TEMPLATE_NAME%.*}"
    # Get the last part form file name and check if it is template
    IS_TEMPLATE="${TEMPLATE_FILE_NAME##*.}"
    if [ "$IS_TEMPLATE" == "template" ]; then
        # Get everything but the last part (.template) and append .json to construct new name
        TEMPLATE_FILE_NAME="${TEMPLATE_FILE_NAME%.*}.json"
        PRE_GENERATED_MANIFEST_FILENAME="./config/$(basename "$TEMPLATE_FILE_NAME")"
    else
        PRE_GENERATED_MANIFEST_FILENAME="./config/$(basename "$MANIFEST_TEMPLATE_NAME")"
    fi
else
    PRE_GENERATED_MANIFEST_FILENAME="./config/deployment.json"
fi

if [ ! -f "$PRE_GENERATED_MANIFEST_FILENAME" ]; then
    echo "$(error) Manifest file \"$PRE_GENERATED_MANIFEST_FILENAME\" does not exist. Please check config folder under current directory: \"$PWD\" to see if manifest file is generated or not"
fi


# This step deploys the configured deployment manifest to the edge device. After completed,
# the device will begin to pull edge modules and begin executing workloads (including sending
# messages to the cloud for further processing, visualization, etc).
# Check if a deployment with given name, already exists in IoT Hub. If it doesn't exist create a new one.
# If it exists, append a random number to user given deployment name and create a deployment.

echo "Deploying manifest file to IoT Hub."

az iot edge deployment create --deployment-id "$DEPLOYMENT_NAME" --hub-name "$IOTHUB_NAME" --content "$PRE_GENERATED_MANIFEST_FILENAME" --target-condition "deviceId='$DEVICE_NAME'" --output "none"

echo "$(info) Deployed manifest file to IoT Hub. Your modules are being deployed to your device now. This may take some time."

echo "$(info) Pausing execution of script for 5 minutes to allow manifest deployment to complete"
sleep 5m

DEVICE_CONNECTED=$( az iot hub query -n "$IOTHUB_NAME" -q "select connectionState from devices where devices.deviceId = '$DEVICE_NAME'" | jq  -r '.[].connectionState')
        

if [ ! "$DEVICE_CONNECTED" == "Connected" ]; then
        echo "$(error) Edge device is not connected to IoT Hub. Please check connectivity on Edge device."
        echo "$(error) Current Edge Device Status is $DEVICE_CONNECTED"
        exitWithError
fi

DEVICE_RUNNING="Failed"
MODULE_RUNNING="Failed"

for ((i=1; i<=5; i++)); do
    
    if [ ! "$DEVICE_RUNNING" == "200" ]; then
        # shellcheck disable=2016
        DEVICE_RUNNING=$( az iot hub query -n "$IOTHUB_NAME" -q "select properties.reported.azureDeviceUpdateAgent.client.resultCode from devices where devices.deviceId = '$DEVICE_NAME'" --query "[].resultCode" --output tsv)
        sleep 1m
    fi

done

if [ ! "$DEVICE_RUNNING" == "200" ]; then
    echo "$(error) IoT Edge runtime is reporting running state. Please check IoT Edge runtime on Edge device"
    echo "$(error) Current IoT Edge Runtime Status is $DEVICE_RUNNING"
    exitWithError
fi

# Restart the lvaEdge Module on device to update it's properties
echo "$(info) Restarting the lvaEdge module on edge device"
RESTART_MODULE=$(az iot hub invoke-module-method --method-name "RestartModule" -n "$IOTHUB_NAME" -d "$DEVICE_NAME" -m "\$edgeAgent" --method-payload \
'{"schemaVersion": "1.0","id": "lvaEdge"}')

if [ "$(echo "$RESTART_MODULE" | jq '.status')" == 200 ]; then
	echo "$(info) Restarted the lvaEdge module on edge device"
else
    echo "$(error) Failed to restart the lvaEdge module on edge device."
    echo "ERROR CODE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.code')"
    echo "ERROR MESSAGE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.message')"
    exitWithError
fi

for ((i=1; i<=8; i++)); do
    
    if [ ! "$MODULE_RUNNING" == "Running" ]; then
        MODULE_RUNNING=$( az iot hub query -n "$IOTHUB_NAME" -q "select properties.reported.State from devices.modules where devices.modules.moduleId = 'lvaEdge' and devices.deviceId = '$DEVICE_NAME'" | jq -r '.[].State')
        sleep 1m
    fi
done


if [ ! "$MODULE_RUNNING" == "Running" ]; then
    echo "$(error) LVA Edge is not not running on Edge device. Please check IoT Edge runtime on Edge device"
    echo "$(error) Current LVA Edge Module Status is $MODULE_RUNNING"
    exitWithError
fi


echo "$(info) Setting LVA graph topology"

GRAPH_TOPOLOGY=$(< lva-topology.json jq '.name = "'"$GRAPH_TOPOLOGY_NAME"'"')

az iot hub invoke-module-method \
    -n "$IOTHUB_NAME" \
    -d "$DEVICE_NAME" \
    -m lvaEdge \
    --mn GraphTopologySet \
    --mp "$GRAPH_TOPOLOGY" \
	--timeout 120


echo "$(info) Getting LVA graph topology status"
TOPOLOGY_STATUS=$(az iot hub invoke-module-method -n "$IOTHUB_NAME" -d "$DEVICE_NAME" -m lvaEdge --mn GraphTopologyGet \
    --mp '{"@apiVersion": "2.0","name": "'"$GRAPH_TOPOLOGY_NAME"'"}')

if [ "$(echo "$TOPOLOGY_STATUS" | jq -r '.payload.name' )" == "$GRAPH_TOPOLOGY_NAME" ]; then
    echo "$(info) Graph Topology has been set on device"
else
    echo "$(error) Graph Topology has not been set on device"
    exitWithError
fi


echo "$(info) Creating a new LVA graph instance"

# Getting rtsp url from Manifest Environment variable file (.env) 
RTSP_URL=$(grep -w "RTSP_URL" ".env" | cut -d'=' -f2)

# shellcheck disable=2016
GRAPH_INSTANCE=$(< lva-topology-params.json jq '.name = "'"$GRAPH_INSTANCE_NAME"'"' | 
    jq '.properties.topologyName = "'"$GRAPH_TOPOLOGY_NAME"'"' | 
    jq --arg replace_value "$RTSP_URL" '.properties.parameters[0].value = $replace_value' )

INSTANCE_LIST=$(az iot hub invoke-module-method -n "$IOTHUB_NAME" -d "$DEVICE_NAME" -m lvaEdge --mn GraphInstanceGet \
    --mp '{"@apiVersion": "2.0","name": "'"$GRAPH_INSTANCE_NAME"'"}')

if [ "$(echo "$INSTANCE_LIST" | jq -r '.payload.name')" == "$GRAPH_INSTANCE_NAME" ]; then
    echo "$(info) Graph Instance already exist"
    echo "$(info) Deactivating LVA graph instance..."
    az iot hub invoke-module-method \
        -n "$IOTHUB_NAME" \
        -d "$DEVICE_NAME" \
        -m lvaEdge \
        --mn GraphInstanceDeactivate \
        --mp '{"@apiVersion": "2.0","name": "'"$GRAPH_INSTANCE_NAME"'"}' \
		--timeout 120
fi

echo "$(info) Setting LVA graph instance"

az iot hub invoke-module-method \
    -n "$IOTHUB_NAME" \
    -d "$DEVICE_NAME" \
    -m lvaEdge \
    --mn GraphInstanceSet \
    --mp "$GRAPH_INSTANCE" \
    --timeout 120


echo "$(info) Getting LVA graph instance status..."
INSTANCE_STATUS=$(az iot hub invoke-module-method -n "$IOTHUB_NAME" -d "$DEVICE_NAME" -m lvaEdge --mn GraphInstanceGet \
    --mp '{"@apiVersion": "2.0","name": "'"$GRAPH_INSTANCE_NAME"'"}')

if [ "$(echo "$INSTANCE_STATUS" | jq -r '.payload.name')" == "$GRAPH_INSTANCE_NAME" ]; then
    echo "$(info) Graph Instance has been created on device."
else
    echo "$(error) Graph Instance has not been created on device"
    exitWithError
fi


echo "$(info) Activating LVA graph instance"
INSTANCE_RESPONSE=$(az iot hub invoke-module-method \
    -n "$IOTHUB_NAME" \
    -d "$DEVICE_NAME" \
    -m lvaEdge \
    --mn GraphInstanceActivate \
    --mp '{"@apiVersion" : "2.0","name" : "'"$GRAPH_INSTANCE_NAME"'"}')


if [ "$(echo "$INSTANCE_RESPONSE" | jq '.status')" == 200 ]; then
    echo "$(info) Graph Instance has been activated on device."
else
    echo "$(error) Failed to activate Graph Instance on device."
    echo "ERROR CODE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.code')"
    echo "ERROR MESSAGE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.message')"
    exitWithError
fi

# Restart the lvaEdge Module on device to update it's properties
echo "$(info) Restarting the lvaEdge module on edge device"
RESTART_MODULE=$(az iot hub invoke-module-method --method-name "RestartModule" -n "$IOTHUB_NAME" -d "$DEVICE_NAME" -m "\$edgeAgent" --method-payload \
'{"schemaVersion": "1.0","id": "lvaEdge"}')

if [ "$(echo "$RESTART_MODULE" | jq '.status')" == 200 ]; then
	echo "$(info) Restarted the lvaEdge module on edge device"
else
    echo "$(error) Failed to restart the lvaEdge module on edge device."
    echo "ERROR CODE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.code')"
    echo "ERROR MESSAGE: $(echo "$INSTANCE_RESPONSE" | jq '.payload.error.message')"
    exitWithError
fi

# Create an AMS asset
echo "$(info) Creating an asset on AMS..."
az ams asset create --account-name "$AMS_ACCOUNT_NAME" --name "$GRAPH_TOPOLOGY_NAME-$GRAPH_INSTANCE_NAME" --resource-group "$RESOURCE_GROUP_AMS" --output "none"

# Checking the existence of Asset on Media Service
# till Max 15 minutes
for ((i=1; i<=60; i++)); do
    ASSET=$(az ams asset list --account-name "$AMS_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_AMS" --query "[?name=='$GRAPH_TOPOLOGY_NAME-$GRAPH_INSTANCE_NAME'].name" -o tsv)

    if [ "$ASSET" == "$GRAPH_TOPOLOGY_NAME"-"$GRAPH_INSTANCE_NAME" ]; then
        break
    else
        sleep 15s
    fi
done

if [ "$ASSET" == "$GRAPH_TOPOLOGY_NAME"-"$GRAPH_INSTANCE_NAME" ]; then

    if [ "$(az ams streaming-locator show --account-name "$AMS_ACCOUNT_NAME" -g "$RESOURCE_GROUP_AMS" --name "$STREAMING_LOCATOR" --query "name" -o tsv)" == "$STREAMING_LOCATOR" ]; then
        echo "$(info) Streaming Locator already exist"
        echo "$(info) Deleting the existing Streaming Locator..."
        az ams streaming-locator delete --account-name "$AMS_ACCOUNT_NAME" -g "$RESOURCE_GROUP_AMS" --name "$STREAMING_LOCATOR" --output "none"
		echo "$(info) Deleted the existing Streaming Locator"
    fi
	
    sleep 10s

    #creating streaming locator for video playback
    echo "$(info) Creating Streaming Locator..."
    az ams streaming-locator create --account-name "$AMS_ACCOUNT_NAME" --asset-name "$GRAPH_TOPOLOGY_NAME-$GRAPH_INSTANCE_NAME" --name "$STREAMING_LOCATOR" --resource-group "$RESOURCE_GROUP_AMS" --streaming-policy-name "Predefined_ClearStreamingOnly" --output "none"
	echo "$(info) Created Streaming Locator"

else
    echo "$(error) AMS Asset not found"
    exitWithError
fi

# Checks and creates 'default' streaming endpoint if it does not exists.
EXISTING_STREAMING_ENDPOINT=$(az ams streaming-endpoint list --account-name "$AMS_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_AMS" --query "[?name=='default'].name" -o tsv)
if [ -z "$EXISTING_STREAMING_ENDPOINT" ];then
    az ams streaming-endpoint create --account-name "$AMS_ACCOUNT_NAME" --name "default" --resource-group "$RESOURCE_GROUP_AMS" --scale-units 0
    echo "$(info) Created streaming endpoint"
fi

# Start the Streaming Endpoint of media service
echo "$(info) Starting the Streaming endpoint..."
az ams streaming-endpoint start --account-name "$AMS_ACCOUNT_NAME" --name "default" --resource-group "$RESOURCE_GROUP_AMS" --output "none"
echo "$(info) Started the Streaming endpoint"

sleep 5m

# Passing Streaming url to script output for video playback
STREAMING_ENDPOINT_HOSTNAME=$(az ams streaming-endpoint show --account-name "$AMS_ACCOUNT_NAME" --resource-group "$RESOURCE_GROUP_AMS" -n "default" --query "hostName" -o tsv)

# Checking the existence of Streaming path on Media Service
# till Max 15 minutes
for ((i=1; i<=60; i++)); do
    STREAMING_PATH=$(az ams streaming-locator get-paths -a "$AMS_ACCOUNT_NAME" -g "$RESOURCE_GROUP_AMS" -n "$STREAMING_LOCATOR" --query "streamingPaths[?streamingProtocol=='SmoothStreaming'].paths[]" -o tsv)
	if [ -z "$STREAMING_PATH" ]; then
		sleep 15s
	else
		break
	fi
done

if [ -z "$STREAMING_PATH" ];then
	echo "$(error) Streaming path is not available"
	exitWithError
fi


STREAMING_URL="https://$STREAMING_ENDPOINT_HOSTNAME$STREAMING_PATH"

echo "{STREAMING_URL:\"$STREAMING_URL\" }" > "$AZ_SCRIPTS_OUTPUT_PATH"