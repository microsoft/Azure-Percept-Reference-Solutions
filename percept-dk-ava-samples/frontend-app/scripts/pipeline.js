const Client = require('azure-iothub').Client;

module.exports = class Pipeline {
    constructor(connectionString, deviceId) {
        this.client = Client.fromConnectionString(connectionString);
        this.deviceId = deviceId;
    }

    async directMethod(moduleId, methodName, payload) {
        let result = null;
        try {
            const response = await this.client.invokeDeviceMethod(this.deviceId, moduleId, {
                "methodName": methodName,
                "payload": payload,
                timeoutInSeconds: 120
            });

            if (response.message.statusCode !== 200) {
                console.error(`Direct method(${methodName}) error:  ${response.message.statusMessage}`);
            } else {
                console.log(`Successfully invoked the direct method(${methodName}).`, JSON.stringify(response.result));
                result = response.result;
            }

        } catch (err) {
            console.error(`Direct method(${methodName}) error:  ${err.message}`);
        } finally {
            return result;
        }
    }

    async setVideo(url, name, title) {
        // get live pipeline
        let livePipeline = await this.directMethod(
            "avaedge",
            "livePipelineGet", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (!livePipeline) return false;
        // set rtsp video
        const rtspVideoSetResult = await this.directMethod(
            "videoDownloader",
            "rtspVideoSet", {
            "url": url,
            "name": name
        });
        if(!rtspVideoSetResult) return false;
        // deactivate live pipeline        
        const livePipelineDeactivateResult = await this.directMethod(
            "avaedge",
            "livePipelineDeactivate", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (!livePipelineDeactivateResult) return false;
        // set name and title
        let parameters = livePipeline.payload.properties.parameters;
        if (name && title) {
            parameters = [
                {
                    "name": "rtspUrl",
                    "value": `rtsp://rtspsim:554/media/${name}`
                },
                {
                    "name": "rtspUserName",
                    "value": "testuser"
                },
                {
                    "name": "rtspPassword",
                    "value": "testpassword"
                },
                {
                    "name": "avavideotitle",
                    "value": title
                }
            ];
        }
        // set live pipeline
        const livePipelineSetResult = await this.directMethod(
            "avaedge",
            "livePipelineSet", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount",
            "properties": {
                "topologyName": "InferencingWithPersonCount",
                "description": "Sample pipeline description",
                "parameters": parameters
            }
        });
        if (!livePipelineSetResult) return false;
        // activate live pipeline
        const livePipelineActivateResult = await this.directMethod(
            "avaedge",
            "livePipelineActivate", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (livePipelineActivateResult) return true; // succeeded
    }

    async setZones(zones) {
        // get pipeline topology
        let pipelineTopology = await this.directMethod(
            "avaedge",
            "pipelineTopologyGet", {
            "@apiVersion": "1.0",
            "name": "InferencingWithPersonCount"
        });
        if (!pipelineTopology) return false;
        // get live pipeline
        let livePipeline = await this.directMethod(
            "avaedge",
            "livePipelineGet", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (!livePipeline) return false;
        // deactivate live pipeline
        const livePipelineDeactivateResult = await this.directMethod(
            "avaedge",
            "livePipelineDeactivate", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (!livePipelineDeactivateResult) return false;
        // delete live pipeline
        const livePipelineDeleteResult = await this.directMethod(
            "avaedge",
            "livePipelineDelete", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (!livePipelineDeleteResult) return false;
        // set zones
        if (zones) {
            pipelineTopology.payload.properties.processors[0].operation.zones = zones;
        }
        // set pipeline topology
        const pipelineTopologySetResult = await this.directMethod(
            "avaedge",
            "pipelineTopologySet", {
            "@apiVersion": "1.0",
            "name": "InferencingWithPersonCount",
            "properties": {
                "description": "Sample pipeline description",
                "parameters": pipelineTopology.payload.properties.parameters,
                "sources": pipelineTopology.payload.properties.sources,
                "processors": pipelineTopology.payload.properties.processors,
                "sinks": pipelineTopology.payload.properties.sinks
            }
        });
        if (!pipelineTopologySetResult) return false;
        // set live pipeline
        const livePipelineSetResult = await this.directMethod(
            "avaedge",
            "livePipelineSet", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount",
            "properties": {
                "topologyName": "InferencingWithPersonCount",
                "description": "Sample pipeline description",
                "parameters": livePipeline.payload.properties.parameters
            }
        });
        if (!livePipelineSetResult) return false;
        // activate live pipeline
        const livePipelineActivateResult = await this.directMethod(
            "avaedge",
            "livePipelineActivate", {
            "@apiVersion": "1.0",
            "name": "PipelinePersonCount"
        });
        if (livePipelineActivateResult) return true; // succeeded
    }
}