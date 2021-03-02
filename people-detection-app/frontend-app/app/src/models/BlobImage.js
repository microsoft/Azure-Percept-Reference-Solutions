export class BlobImage {
    async updateImage(blobServiceClient, containerName, blobPath, imageName) {
        const blobName = `${blobPath}/${imageName.split('T')[0]}/${imageName}.jpg`;
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(blobName);

        const downloadBlockBlobResponse = await blobClient.download();
        const downloaded = await this.blobToBinaryString(await downloadBlockBlobResponse.blobBody);
        return `data:image/jpeg;base64,${btoa(downloaded)}`;
    }

    async blobToBinaryString(blob) {
        const fileReader = new FileReader();
        return new Promise((resolve, reject) => {
            fileReader.onloadend = (ev) => {
                resolve(ev.target.result);
            };
            fileReader.onerror = reject;
            fileReader.readAsBinaryString(blob);
        });
    }
}