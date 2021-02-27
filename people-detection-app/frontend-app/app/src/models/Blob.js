export class Blob {
    async get(blobServiceClient, iotHubName, dates) {
        const blobs = [];
        const l = dates.length;
        for (let d = 0; d < l; d++) {
            const hours = dates[d].getUTCHours();
            let hoursString = `${hours}`;
            const hoursStringLength = hoursString.length;
            if (hoursStringLength < 2) {
                hoursString = `0${hours}`;
            }
            const minutes = dates[d].getUTCMinutes();
            let minutesString = `${minutes}`;
            const minutesStringLength = minutesString.length;
            if (minutesStringLength < 2) {
                minutesString = `0${minutes}`;
            }

            const date = dates[d];
            date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
            const dateLocaleString = date.toLocaleDateString('fr-CA', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            const dateString = dateLocaleString.replace(/-/g, '/')

            if (hoursString.length < 2 || minutesString.length < 2) {
                console.log(`${hoursString}:${minutesString}`);
            } else {
                try {
                    let containerName = "";
                    let partition = -1;
                    for (let p = 0; p < 4; p++) {
                        containerName = `${iotHubName}/0${p}/${dateString}/${hoursString}/${minutesString}`;
                        const exists = await this.blobExists(blobServiceClient, "detectoroutput", `${containerName}.json`);
                        if (exists) {
                            partition = p;
                            break;
                        }
                    }
                    if (partition >= 0) {
                        const containerClient = blobServiceClient.getContainerClient("detectoroutput");
                        let iter = containerClient.listBlobsByHierarchy("/", { prefix: `${containerName}.json` });
                        for await (const item of iter) {
                            const blob = await this.downloadBlob(blobServiceClient, "detectoroutput", item.name);
                            blobs.push(blob);
                        }
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        }
        return blobs;
    }

    async blobExists(blobServiceClient, containerName, blobName) {
        try {
            const containerClient = blobServiceClient.getContainerClient(containerName);
            const blobClient = containerClient.getBlobClient(blobName);
            const exists = blobClient.exists();
            return exists;
        } catch (e) {
            // console.log(e);
            return false;
        }
    }

    async downloadBlob(blobServiceClient, containerName, blobName) {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadBlockBlobResponse = await blobClient.download();

        const downloaded = await this.blobToString(await downloadBlockBlobResponse.blobBody);
        const views = downloaded.replace(/\\"/g, /'/).split('\r\n');

        const frames = [];
        const l = views.length;
        for (let i = 0; i < l; i++) {
            const view = views[i];
            if (view && view !== undefined && view !== "") {
                let parsedView = JSON.parse(view);
                if (parsedView.hasOwnProperty('Body')) {
                    let body = parsedView.Body;
                    if (body && body !== undefined && body !== "") {
                        let decodedBody = atob(body);
                        if (decodedBody && decodedBody !== undefined && decodedBody !== "") {
                            try {
                                let parsedBody = JSON.parse(decodedBody);
                                if (parsedBody && parsedBody != undefined && parsedBody != "") {
                                    if (parsedBody.hasOwnProperty('NEURAL_NETWORK')) {
                                        if (parsedBody.NEURAL_NETWORK.length > 0) {
                                            frames.push(parsedBody);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.log(e);
                            }
                        }
                    }
                }
            }
        }

        return frames;
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
}