const socket = io();

class App {
    constructor(
        playerContainer,
        editorContainer,
        peopleOnScreenElement,
        peopleInZonesElement,
        peopleCountChartElement
    ) {
        //html elements
        this.playerContainer = playerContainer;
        this.editorContainer = editorContainer;
        this.peopleCountChartElement = peopleCountChartElement;
        this.peopleInZonesElement = peopleInZonesElement;
        this.peopleOnScreenElement = peopleOnScreenElement;
        //services
        this.settingsService = new SettingsService();
        this.zonesService = new ZonesService();
        //player
        this.player = new Player(this.playerContainer, this.settingsService, this.zonesService);
        this.editor = new Editor(this.editorContainer, this.settingsService, this.zonesService);
        // chart and metrics
        this.peopleOnScreen = 0;
        this.peopleInZones = 0;
        this.peopleOnScreenDatasetIndex = 0;
        this.peopleInZonesDatasetIndex = 1;
        this.peopleCountChartSize = 60;
        this.peopleCountChartDataset = [{
            backgroundColor: '#0840cf77',
            borderColor: '#0840cfff',
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderWidth: 1,
            borderJoinStyle: 'miter',
            cubicInterpolation: 'monotone',
            data: new Array(this.peopleCountChartSize).fill(null),
            fill: false,
            label: 'on screen',
            pointBorderColor: '#0840cfff',
            pointBackgroundColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgba(192,192,192,1)',
            pointHoverBorderColor: 'rgba(220,220,220,1)',
            pointHoverBorderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            tension: 0.4
        }, {
            backgroundColor: '#db464677',
            borderColor: '#db4646ff',
            borderCapStyle: 'butt',
            borderDash: [],
            borderDashOffset: 0.0,
            borderWidth: 1,
            borderJoinStyle: 'miter',
            cubicInterpolation: 'monotone',
            data: new Array(this.peopleCountChartSize).fill(null),
            fill: false,
            label: 'in zones',
            pointBorderColor: '#db4646ff',
            pointBackgroundColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 5,
            pointHoverBackgroundColor: 'rgba(192,192,192,1)',
            pointHoverBorderColor: 'rgba(220,220,220,1)',
            pointHoverBorderWidth: 2,
            pointRadius: 0,
            pointHitRadius: 10,
            tension: 0.4
        }];
        this.peopleCountChart = new Chart(this.peopleCountChartElement.getContext('2d'), {
            type: 'line',
            data: {
                labels: new Array(this.peopleCountChartSize).fill(''),
                datasets: this.peopleCountChartDataset
            },
            options: {
                legend: {
                    display: true
                },
                animation: {
                    duration: 0
                },
                hover: {
                    animationDuration: 0
                },
                responsiveAnimationDuration: 0,
                scales: {
                    yAxes: [{
                        ticks: {
                            max: 100,
                            min: 0,
                            stepSize: 50
                        }
                    }],
                    xAxes: [{
                        ticks: {
                            fontSize: 5
                        }
                    }]
                }
            }
        });
    }
    load() {
        this.loadSocket();
        this.loadServices();
        this.loadMetrics();
    }
    loadMetrics() {
        setInterval(() => {
            if (!this.player.bodyTrackingOn) {
                this.peopleOnScreen = 0;
                this.peopleInZones = 0;
            }
            if (this.peopleCountChart) {
                this.updatePeopleCountChart();
            }
            this.peopleOnScreenElement.innerHTML = this.peopleOnScreen;
            this.peopleInZonesElement.innerHTML = this.peopleInZones;
        }, 1000);
    }
    loadServices() {
        // get settings and zones
        this.settingsService.getSettings();
        this.zonesService.getZones();

        // load editor and player
        const isLoadedInterval = setInterval(() => {
            if (this.settingsService.settings && this.zonesService.zones) {
                this.editor.load();
                this.player.load({
                    parseInferenceCallback: this.parseInference,
                    toggleBodyTrackingCallback: this.toggleBodyTracking,
                    drawInferencesCallback: this.drawInferences
                });
                clearInterval(isLoadedInterval);
            }
        }, 1000);
    }
    loadSocket() {
        // socket on callbacks
        socket.on('zones', (data) => {
            this.zonesService.zones = this.zonesService.parseZones(data);
        });
        socket.on('settings', (data) => {
            this.settingsService.settings = JSON.parse(data);
        });
    }

    // ava player callbacks
    parseInference = (inference) => {
        let data = null;
        if (inference.type === 'MOTION' || inference.type === 'ENTITY') {
            data = inference?.motion?.box || inference?.entity?.box;
            if (inference.type === 'ENTITY') {
                data.entity = {
                    id: inference.entity.id || inference.sequenceId || inference.inferenceId,
                    tag: inference.entity.tag.value
                };
            }
        } else if (inference.type === 'EVENT') {
            data = {
                inferenceId: inference.inferenceId,
                relatedInferences: inference.relatedInferences,
                event: inference.event
            };
        }
        return data;
    }

    toggleBodyTracking = (isOn) => {
        this.player.bodyTrackingOn = isOn;
    }

    drawInferences = (inferences, context, canvas) => {
        const width = canvas.width;
        const height = canvas.height;
        const screenColor = '#0840cf';
        const zonesColor = '#db4646';
        const personColor = '#000000';
        const events = [];
        const l = inferences.length;
        for (let i = 0; i < l; i++) {
            const inference = inferences[i];
            if (inference.event !== undefined) {
                events.push(inference.event);
                const name = inference.event.properties.zone;
                const l = this.zonesService.zones.length;
                for (let i = 0; i < l; i++) {
                    const zone = this.zonesService.zones[i];
                    if (zone.name === name) {
                        context.lineWidth = name === 'screen' ? 5 : 2.5;
                        context.lineJoin = 'miter';
                        context.strokeStyle = name === 'screen' ? `${screenColor}` : `${zonesColor}66`;

                        let path = new Path2D();
                        const pl = zone.polygon.length;
                        for (let p = 0; p < pl; p++) {
                            const point = { x: width * zone.polygon[p].x, y: height * zone.polygon[p].y };
                            if (p == 0) {
                                path.moveTo(point.x, point.y);
                            }
                            path.lineTo(point.x, point.y);
                        }
                        path.closePath();
                        context.stroke(path);
                        if (name !== 'screen') {
                            context.fillStyle = `${zonesColor}11`;
                            context.fill(path);
                        }
                    }
                }
            } else if (inference.entity !== undefined) {
                context.lineWidth = 2.5;
                context.lineJoin = 'miter';
                context.strokeStyle = `${personColor}99`;
                const x = Math.floor(inference.l * width);
                const y = Math.floor(inference.t * height);
                const w = Math.floor(inference.w * width);
                const h = Math.floor(inference.h * height);
                context.strokeRect(x, y, w, h);
                context.fillStyle = `${personColor}11`;
                context.fillRect(x, y, w, h);
            }
        }
        this.updatePeopleCountMetrics(events);
    }

    // chart and metrics
    updatePeopleCountChart = () => {
        if (this.peopleCountChart.data.labels.length > this.peopleCountChartSize) {
            this.peopleCountChart.data.datasets[this.peopleOnScreenDatasetIndex].data.shift();
            this.peopleCountChart.data.datasets[this.peopleInZonesDatasetIndex].data.shift();
            this.peopleCountChart.data.labels.shift();
        }
        this.peopleCountChart.data.datasets[this.peopleOnScreenDatasetIndex].data.push(this.peopleOnScreen);
        this.peopleCountChart.data.datasets[this.peopleInZonesDatasetIndex].data.push(this.peopleInZones);
        this.peopleCountChart.data.labels.push('');
        this.peopleCountChart.update();
    }

    updatePeopleCountMetrics = (events) => {
        let peopleOnScreen = 0;
        let peopleInZones = 0;
        const l = events.length;
        for (let i = 0; i < l; i++) {
            const event = events[i];
            const count = +event.properties.personCount;
            if (event.properties.zone === 'screen') {
                peopleOnScreen += count;
            } else {
                peopleInZones += count;
            }
        }
        this.peopleOnScreen = peopleOnScreen;
        this.peopleInZones = peopleInZones;
    }
}

// resusable library
class Player {
    constructor(container, settingsService, zonesService) {
        this.container = container;
        this.settingsService = settingsService;
        this.zonesService = zonesService;
        this.playerWidget = null;
        this.bodyTrackingOn = false;
    }
    load(callbacks) {
        this.playerWidget = new window.ava.widgets.player(this.settingsService.settings.avaPlayer);
        this.container.appendChild(this.playerWidget);
        if (callbacks) {
            this.playerWidget.setCallbacks(callbacks);
        }
        this.playerWidget.load();
    }
}

class Editor {
    constructor(container, settingsService, zonesService) {
        this.container = container;
        this.settingsService = settingsService;
        this.zonesService = zonesService;
        this.zoneDrawer = null;
        this.playerWidget = null;
    }
    load() {
        this.zoneDrawer = new window.ava.widgets.zoneDrawer();
        this.container.appendChild(this.zoneDrawer);

        this.playerWidget = new window.ava.widgets.player(this.settingsService.settings.avaPlayer);
        this.zoneDrawer.appendChild(this.playerWidget);
        this.playerWidget.load();

        this.zoneDrawer.configure({
            locale: "en",
            zones: this.zonesService.zones.filter((zone) => {
                return zone.name !== 'screen'
            })
        });
        this.zoneDrawer.addEventListener("ZONE_DRAWER_SAVE", (event) => {
            let zonesOutput = [];
            for (const iterator of event?.detail) {
                zonesOutput.push(iterator);
            }
            this.zonesService.setZones([this.zonesService.zones[0], ...zonesOutput]);
        });
        this.zoneDrawer.load();
    }
}

class SettingsService {
    constructor() {
        this.settings = null;
    }

    getSettings() {
        socket.emit('get settings', '');
    }
}

class ZonesService {
    constructor() {
        this.zones = null;
    }

    formatPolygonArray = (polygon) => {
        const polygonArray = [];
        const l = polygon.length;
        for (let i = 0; i < l; i++) {
            const point = polygon[i];
            polygonArray.push([point.x, point.y]);
        }
        return JSON.stringify(polygonArray);
    }

    getZones() {
        socket.emit('get zones', '');
    }

    setZones(zones) {
        const formattedZones = [];
        const l = zones.length;
        for (let i = 0; i < l; i++) {
            const zone = zones[i];
            zone.name = zone.name.replace(' ', '');
            zone.polygon = this.formatPolygonArray(zone.polygon);
            formattedZones.push({
                zone: zone,
                events: [
                    {
                        trigger: "interval",
                        outputFrequency: "1",
                        threshold: "16",
                        focus: "footprint"
                    }
                ]
            });
        }

        socket.emit('set zones', JSON.stringify(formattedZones));
    }

    parseZones(data) {
        const zones = [];

        const parsedData = JSON.parse(data);
        if (parsedData !== undefined) {
            const formatPolygon = (polygonArray) => {
                let polygon = [];
                const l = polygonArray.length;
                for (let i = 0; i < l; i++) {
                    polygon.push({
                        x: polygonArray[i][0],
                        y: polygonArray[i][1]
                    });
                }
                return polygon;
            }
            const l = parsedData.length;
            for (let i = 0; i < l; i++) {
                const zone = parsedData[i].zone;
                const parsedPolygon = JSON.parse(zone.polygon);
                const polygon = formatPolygon(parsedPolygon);
                zone.polygon = polygon;
                zones.push(zone);
            }
        }

        return zones;
    }
}
