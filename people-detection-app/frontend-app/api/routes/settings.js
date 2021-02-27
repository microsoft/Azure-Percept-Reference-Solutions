var express = require('express');
var router = express.Router();

/* GET settings. */
router.get('/', function (req, res, next) {
    const settings = {
        ampStreamingUrl: process.env.APPSETTING_AMP_STREAMING_URL,
        iotHubName: process.env.APPSETTING_IOT_HUB_NAME,
        password: process.env.APPSETTING_PASSWORD,
        storageBlobAccount: process.env.APPSETTING_STORAGE_BLOB_ACCOUNT,
        storageBlobSharedAccessSignature: process.env.APPSETTING_STORAGE_BLOB_SHARED_ACCESS_SIGNATURE
    };
    res.send(JSON.stringify(settings));
});

module.exports = router;