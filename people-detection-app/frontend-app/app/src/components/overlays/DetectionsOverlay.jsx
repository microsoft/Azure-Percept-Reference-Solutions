import React from 'react';

export class DetectionsOverlay extends React.Component {
    static defaultProps = {
        detections: [],
        drawDetection: (canvasContext, canvasSize, detection) => {
            canvasContext.strokeStyle = 'violet';
            canvasContext.lineWidth = 2;
            canvasContext.strokeRect(
                canvasSize.width * detection.x,
                canvasSize.height * detection.y,
                canvasSize.width * Math.abs(detection.w - detection.x),
                canvasSize.height * Math.abs(detection.h - detection.y)
            );
        },
        draw: true,
        fps: 30,
        width: 300,
        height: 300,
        margin: 10,
        zIndex: 2
    }
    constructor(props) {
        (props);
        this.canvasRef = React.createRef();
    }

    componentDidMount() {
        setInterval(() => {
            if(this.props.draw) {
                const canvasContext = this.canvasRef.current?.getContext("2d");
                if (canvasContext) {
                    canvasContext.clearRect(0, 0, this.props.width, this.props.height);
                    for(detection in this.props.detections) {
                        this.props.drawDetection(
                            canvasContext,
                            {
                                width: this.props.width,
                                height: this.props.height
                            },
                            detection
                        );
                    }
                }
            }
        }, 1000 / this.props.fps);
    }

    render() {
        return (
            <React.Fragment>
                <div
                    style={{
                        position: 'relative',
                        width: this.props.width,
                        height: this.props.height,
                        margin: this.props.margin
                    }}
                >
                    <canvas
                        ref={this.canvasRef}
                        width={this.props.width}
                        height={this.props.height}
                        style={{
                            position: 'absolute',
                            zIndex: this.props.zIndex
                        }}
                    />
                </div>
            </React.Fragment>
        );
    }
}
