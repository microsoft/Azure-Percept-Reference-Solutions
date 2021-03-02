import React from 'react';
import { Editor } from './Editor';

export class Camera extends React.Component {
    static defaultProps = {
        border: '0px solid black',
        width: 300,
        height: 300,
        fps: 30,
        aggregator: {
            lines: [],
            zones: []
        },
        frame: {
            detections: []
        },
        ampStreamingUrl: null
    }
    constructor(props) {
        super(props);
        // TODO: temp for dev, remove when finished with it
        const devOptions = JSON.parse(localStorage.getItem("UES-APP-DEVOPTIONS")) || {
            syncOffset: 0,
            syncBuffer: 0.1,
            restartTime: 0
        };

        this.state = {
            aggregator: JSON.parse(JSON.stringify(this.props.aggregator)),
            ampStreamingUrl: null,

            // TODO: temp for dev, remove when finished with it
            syncOffset: devOptions.syncOffset,
            syncBuffer: devOptions.syncBuffer,
            restartTime: devOptions.restartTime,
            editingAllowed: false
        };

        this.canvasRef = React.createRef();
        this.videoRef = React.createRef();
        this.amp = null;

        this.currentMediaTime = null;
        this.inferences = {};
        this.detections = [];
    }

    componentDidMount() {
        if (this.props.ampStreamingUrl) {
            this.setState({
                ampStreamingUrl: this.props.ampStreamingUrl
            }, () => {
                this.amp = window.amp(this.videoRef.current, {
                    "nativeControlsForTouch": false,
                    autoplay: true,
                    controls: false,
                    width: this.props.width,
                    height: this.props.height,
                });
                this.amp.src([
                    {
                        "src": this.state.ampStreamingUrl,
                        "type": "application/vnd.ms-sstr+xml"
                    }
                ]);
            });
        }
        setInterval(() => {
            this.draw();
        }, 1000 / this.props.fps);

        setInterval(() => {
            this.sync();
        }, 1000);

        setInterval(() => {
            this.updateCurrentMediaTime();
        }, 1000 / this.props.fps);

        setInterval(() => {
            this.updateDetections();
        }, 1000 / this.props.fps);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.aggregator !== this.props.aggregator) {
            this.setState({
                aggregator: this.props.aggregator
            });
        }
        if (prevProps.ampStreamingUrl !== this.props.ampStreamingUrl) {
            this.setState({
                ampStreamingUrl: this.props.ampStreamingUrl
            }, () => {
                if (!this.amp) {
                    this.amp = window.amp(this.videoRef.current, {
                        "nativeControlsForTouch": false,
                        autoplay: true,
                        controls: false,
                        width: this.props.width,
                        height: this.props.height,
                    });
                }
                this.amp.src([
                    {
                        "src": this.state.ampStreamingUrl,
                        "type": "application/vnd.ms-sstr+xml"
                    }
                ]);
            });
        }
    }

    render() {
        return (
            <React.Fragment>
                <div
                    style={{
                        margin: 10,
                        padding: 5,
                        backgroundColor: '#d3d3d3',
                        position: 'relative'
                    }}>
                    <label
                        style={{ marginLeft: 5 }}>
                        Start play at (in seconds)
                    </label>
                    <input
                        type="number"
                        step="1"
                        style={{ marginLeft: 5 }}
                        defaultValue={this.state.restartTime}
                        onChange={(e) => this.setState({ restartTime: +e.target.value }, () => { this.saveDevOptions() })}
                    />
                    <input
                        type="button"
                        value="Play"
                        style={{ marginLeft: 5 }}
                        onClick={(e) => {
                            this.amp.currentTime(this.state.restartTime);
                            this.amp.play();
                        }}
                    />
                    <span style={{ float: 'right' }}>
                        <label
                            style={{ marginLeft: 5 }}>
                            Edit
                        </label>
                        <input
                            type="checkbox"
                            style={{ marginLeft: 5 }}
                            defaultChecked={this.state.editingAllowed}
                            onChange={(e) => this.setState({ editingAllowed: e.target.checked })}
                        />
                    </span>
                    {
                        this.state.editingAllowed ? (
                            <React.Fragment>
                                <br />
                                <label
                                    style={{ marginLeft: 5 }}>
                                    Offset
                                </label>
                                <input
                                    type="number"
                                    step="250"
                                    style={{ marginLeft: 5 }}
                                    defaultValue={this.state.syncOffset}
                                    onChange={(e) => this.setState({ syncOffset: +e.target.value }, () => { this.saveDevOptions() })}
                                />
                                <label
                                    style={{ marginLeft: 5 }}>
                                    Buffer
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    style={{ marginLeft: 5 }}
                                    defaultValue={this.state.syncBuffer}
                                    onChange={(e) => this.setState({ syncBuffer: +e.target.value }, () => { this.saveDevOptions() })}
                                />
                            </React.Fragment>
                        ) : null
                    }
                </div>
                <div
                    style={{
                        margin: 10,
                        width: this.props.width,
                        height: this.props.height,
                        position: 'relative'
                    }}
                >
                    {
                        this.state.ampStreamingUrl ? (
                            <video
                                ref={this.videoRef}
                                className="azuremediaplayer amp-default-skin amp-big-play-centered"
                                style={{
                                    position: 'absolute',
                                    zIndex: 1
                                }}
                                tabIndex={2}
                            />
                        ) : null
                    }

                    <canvas
                        ref={this.canvasRef}
                        width={this.props.width}
                        height={this.props.height}
                        style={{
                            border: this.props.border,
                            position: 'absolute',
                            zIndex: 2
                        }}
                        tabIndex={1}
                    />
                    <Editor
                        fps={this.props.fps}
                        width={this.props.width}
                        height={this.props.height}
                        aggregator={this.props.aggregator}
                        updateAggregator={this.props.updateAggregator}
                        selectedZoneIndex={this.props.selectedZoneIndex}
                        updateSelectedZoneIndex={this.props.updateSelectedZoneIndex}
                        collision={this.props.collision}
                        editingAllowed={this.state.editingAllowed}
                    />
                </div>
            </React.Fragment>
        );
    }

    // TODO: temp for dev, remove when finished with it
    saveDevOptions = () => {
        localStorage.setItem("UES-APP-DEVOPTIONS", JSON.stringify({
            syncOffset: this.state.syncOffset,
            syncBuffer: this.state.syncBuffer,
            restartTime: this.state.restartTime,
        }));
    }

    updateCurrentMediaTime = () => {
        if (this.amp && this.amp.currentMediaTime) {
            this.currentMediaTime = this.amp.currentMediaTime();
        }
    }

    updateDetections = () => {
        if (this.currentMediaTime && !this.paused) {
            const detections = [];
            for (const inference in this.inferences) {
                const currentMediaTime = new Date(this.currentMediaTime * 1000);
                const inferenceTime = new Date(this.inferences[inference].timestamp / 1000 / 1000);

                const cmTime = currentMediaTime.getTime() + this.state.syncOffset;
                const iTime = inferenceTime.getTime();
                const difference = cmTime - iTime;
                const seconds = Math.abs(difference / 1000);
                if (seconds <= this.state.syncBuffer && this.isPerson(this.inferences[inference])) {
                    this.inferences[inference].inZone = this.isDetectionInZones(this.inferences[inference].bbox, this.props.aggregator.zones);
                    detections.push(this.inferences[inference]);
                }
            }
            this.detections = detections;
            this.props.updateDetections(this.detections);
        }
    }

    isPerson = (inference) => {
        if (inference.hasOwnProperty("label")) {
            return inference.label === "person";
        }
        return false;
    }

    isDetectionInZones(bbox, zones) {
        const l = zones.length;
        for (let i = 0; i < l; i++) {
            const zone = zones[i];
            if (zone.polygon.length > 0) {
                if (this.props.collision.isBBoxInZones(bbox, [zone])) {
                    return true;
                }
            }
        }
        return false;
    }

    async sync() {
        if (this.amp && this.amp.currentMediaTime && !this.paused) {
            const dates = [
                new Date(this.currentMediaTime * 1000),
                new Date(this.currentMediaTime * 1000),
                new Date(this.currentMediaTime * 1000)
            ];
            dates[0].setMinutes(dates[0].getMinutes() - 1);
            dates[2].setMinutes(dates[2].getMinutes() + 1);

            const blobs = await this.props.blob.get(this.props.blobServiceClient, this.props.iotHubName, dates);

            for (let i = 0; i < blobs.length; i++) {
                const blob = blobs[i];
                for (let j = 0; j < blob.length; j++) {
                    const view = blob[j];
                    const inferences = view.NEURAL_NETWORK;
                    for (let j = 0; j < inferences.length; j++) {
                        const inference = inferences[j];
                        const time = inference.timestamp;
                        if (!this.inferences.hasOwnProperty(time)) {
                            this.inferences[time] = inference;
                        }
                    }
                }
            }
        }
    }

    draw = () => {
        const canvasContext = this.canvasRef.current?.getContext("2d");
        if (canvasContext) {
            canvasContext.clearRect(0, 0, this.props.width, this.props.height);
            this.drawDetections(canvasContext, this.detections);
        }
    }

    drawDetections(canvasContext, detections) {
        const l = detections.length;
        for (let i = 0; i < l; i++) {
            const detection = detections[i];
            this.drawDetection(canvasContext, detection);
        }
    }

    drawDetection(canvasContext, detection) {
        if (detection.hasOwnProperty("box")) {
            detection.bbox = [
                detection.box.l,
                detection.box.t,
                detection.box.w,
                detection.box.h
            ];
        }

        if (detection.inZone) {
            canvasContext.strokeStyle = 'yellow';
            canvasContext.lineWidth = 4;
        } else {
            canvasContext.strokeStyle = 'lightblue';
            canvasContext.lineWidth = 2;
        }
        const x = this.props.width * detection.bbox[0];
        const y = this.props.height * detection.bbox[1];
        const w = this.props.width * Math.abs(detection.bbox[2] - detection.bbox[0]);
        const h = this.props.height * Math.abs(detection.bbox[3] - detection.bbox[1]);
        canvasContext.strokeRect(x, y, w, h);
    }
}