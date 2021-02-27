import React from 'react';

export class AggregatorOverlay extends React.Component {
    static defaultProps = {
        aggregator: {
            lines: [],
            zones: []
        },
        drawLine: (canvasContext, canvasSize, line) => {
            canvasContext.strokeStyle = 'violet';
            canvasContext.lineWidth = 3;
            const l = line.points.length;
            for (let i = 0; i < l; i++) {
                const point = line.points[i];
                if (i === 0) {
                    canvasContext.moveTo(point.x * canvasSize.width, point.y * canvasSize.height);
                } else {
                    canvasContext.lineTo(point.x * canvasSize.width, point.y * canvasSize.height);
                }
            }
            canvasContext.closePath();
            canvasContext.stroke();
        },
        drawZone: (canvasContext, canvasSize, zone) => {
            canvasContext.strokeStyle = 'violet';
            canvasContext.lineWidth = 3;
            const l = zone.polygon.points.length;
            for (let i = 0; i < l; i++) {
                if (i > 0) {
                    const pointA = zone.polygon.points[i - 1];
                    const pointB = zone.polygon.points[i];
                    canvasContext.setLineDash([]);
                    canvasContext.beginPath();
                    canvasContext.moveTo(pointA.x * canvasSize.width, pointA.y * canvasSize.height);
                    canvasContext.lineTo(pointB.x * canvasSize.width, pointB.y * canvasSize.height);
                    canvasContext.closePath();
                    canvasContext.stroke();
                }
            }
        },
        draw: true,
        width: 300,
        height: 300,
        margin: 10,
        zIndex: 1,
        fps: 30,
    }
    constructor(props) {
        (props);
        this.canvasRef = React.createRef();
    }

    componentDidMount() {
        setInterval(() => {
            if (this.props.draw) {
                const canvasContext = this.canvasRef.current?.getContext("2d");
                if (canvasContext) {
                    canvasContext.clearRect(0, 0, this.props.width, this.props.height);
                    for (line in this.props.aggregator.lines) {
                        this.props.drawLine(
                            canvasContext,
                            {
                                width: this.props.width,
                                height: this.props.height
                            },
                            line
                        );
                    }
                    for (zone in this.props.aggregator.zones) {
                        this.props.drawZone(
                            canvasContext,
                            {
                                width: this.props.width,
                                height: this.props.height
                            },
                            zone
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
