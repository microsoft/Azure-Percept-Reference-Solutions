// real time - last 60 seconds
// aggregate - datetime begin to datetime end
export class DetectionService {
    constructor(blobServiceClient, iotHubName, containerName) {
        this.blobServiceClient = blobServiceClient;
        this.iotHubName = iotHubName;
        this.containerName = containerName;
    }

    async blobExists(blobName) {
        const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const exists = blobClient.exists();
        return exists;
    }

    async blobToString(blob) {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onloadend = (ev) => {
                resolve(ev.target.result);
            };
            fileReader.onerror = reject;
            fileReader.readAsText(blob);
        });
    }

    calculateDateRange(time, minutesBefore, minutesAfter) {
        const dates = [];
        for (let i = -minutesBefore; i <= minutesAfter; i++) {
            const date = new Date(time);
            date.setMinutes(date.getMinutes() + i);
            dates.push(date);
        }
        return dates;
    }

    findPartition() {
        for (let i = 0; i < 4; i++) {
            const exists = await this.blobExists(`${this.iotHubName}/0${i}`);
            if (exists) {
                return i;
            }
        }
    }

    getDetections(time, minutesBefore, minutesAfter) {
        const detections = [];
        const dates = this.calculateDateRange(time, minutesBefore, minutesAfter);
        for (const date in dates) {
            const inferences = this.getInferences(date);
            for (const inference in inferences) {
                detections.push(inference);
            }
        }
    }

    // TODO: account for daylight saving
    // TODO: optimize finding partition
    getInferences(date) {
        const inferences = [];

        // hours and minutes need to be 2 digits
        const hours = date.getUTCHours();
        let hoursString = `${hours}`;
        const hoursStringLength = hoursString.length;
        if (hoursStringLength < 2) {
            hoursString = `0${hours}`;
        }
        const minutes = date.getUTCMinutes();
        let minutesString = `${minutes}`;
        const minutesStringLength = minutesString.length;
        if (minutesStringLength < 2) {
            minutesString = `0${minutes}`;
        }

        const date = dates[d];
        const dateLocaleString = date.toLocaleDateString('fr-CA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
        const dateString = dateLocaleString.replace(/-/g, '/')

        const blobName = `${this.props.iotHubName}/0${this.state.blobPartition}/${dateString}/${hoursString}/${minutesString}`;

        const exists = await this.blobExists(this.containerName, blobName);
        if (exists) {
            const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
            let blobs = containerClient.listBlobsByHierarchy("/", { prefix: blobName });
            for await (const blob of blobs) {
                const items = await this.getItems(this.containerName, blob.name);
                for (const item in items) {
                    if (item.hasOwnProperty('inferences')) {
                        for (const inference in item.inferences) {
                            inferences.push(inference);
                        }
                    }
                }
            }
        }

        return inferences;
    }

    async getItems(containerName, blobName) {
        const items = [];

        const containerClient = this.blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadBlockBlobResponse = await blobClient.download();

        const blobString = await this.blobToString(await downloadBlockBlobResponse.blobBody);
        const blobs = blobString.replace(/\\"/g, /'/).split('\r\n');

        const l = blobs.length;
        for (let i = 0; i < l; i++) {
            const blob = blobs[i];
            if (blob && blob !== undefined && blob !== "") {
                try {
                    let parsedBlob = JSON.parse(blob);
                    if (parsedBlob.hasOwnProperty('Body')) {
                        let body = parsedBlob.Body;
                        if (body && body !== undefined && body !== "") {
                            let decodedBody = atob(blobBody);
                            if (decodedBody && decodedBody !== undefined && decodedBody !== "") {
                                try {
                                    let parsedBody = JSON.parse(decodedBody);
                                    if (parsedBody && parsedBody !== undefined && parsedBody !== "") {
                                        items.push(parsedBody);
                                    }
                                } catch (e) {
                                    console.log(e);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }

        return items;
    }
}