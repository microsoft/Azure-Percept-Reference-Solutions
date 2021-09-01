require('dotenv').config();
const multer = require('multer');
const express = require('express');
const expressApp = express();
const httpServer = require('http').Server(expressApp);
const io = require('socket.io')(httpServer);
const path = require('path');
const fs = require('fs');
const Pipeline = require('./scripts/pipeline');

const connectionString = process.env.IOTHUB_CONNECTION_STRING; 
const deviceId = process.env.DEVICE_NAME;
const port = process.env.PORT || 3000;

class App {
    constructor() {
        this.pipeline = new Pipeline(connectionString, deviceId);
        
        io.on('connection', (socket) => {
            console.log('a user connected');
            socket.on('get zones', (msg) => {
                console.log(`get zones: ${msg}`);
                this.getZones();
            });
            socket.on('set zones', (msg) => {
                console.log(`set zones: ${msg}`);
                this.setZones(msg);
            });
            socket.on('get settings', (msg) => {
                fs.readFile("./settings.json", (err, data) => {
                    if (err) {
                        console.log(`get settings error: ${err}`);
                    } else {
                        const settings = JSON.parse(data);
                        io.emit('settings', JSON.stringify({
                            avaPlayer: {
                                clientApiEndpointUrl: process.env.CLIENT_API_ENDPOINT_URL,
                                videoName: process.env.VIDEO_NAME, 
                                token: process.env.JWT_TOKEN 
                            }
                        }));
                    }
                });
            });
            socket.on('disconnect', () => {
                console.log('user disconnected');
            });
        });
        
        httpServer.listen(port, () => {
            console.log(`listening on *:${port}`);
        });
        
        expressApp.use(express.static('scripts'));
        
        expressApp.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'index.html'));
        });
    }

    getZones() {
        const zones = [];
        // TODO: get zones from pipeline if doesn't exist
        fs.readFile("./zones.json", (err, data) => {
            if (err) {
                console.log(`get settings error: ${err}`);
            } else {
                const zones = JSON.parse(data);
                io.emit('zones', JSON.stringify(zones));
            }
        });
    }

    async setZones(zones) {
        const succeeded = await this.pipeline.setZones(JSON.parse(zones));

        if (succeeded) {
            fs.writeFile("./zones.json", zones, (err) => {
                if (err) {
                    console.log(`zones update error: ${err}`);
                } else {
                    console.log(`zones updated: ${zones}`);
                    io.emit('get zones', '');
                }
            });
        }
    }
}

new App();
