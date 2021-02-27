import React from 'react';
import { defaults } from 'react-chartjs-2';
import { Line } from 'react-chartjs-2';

export class CountOfPeopleVsTime extends React.Component {
    static defaultProps = {
        aggregator: {
            lines: [],
            zones: []
        },
        collisions: 0,
        detections: 0
    }

    constructor(props) {
        super(props);
        this.state = {
            totalCollisions: 0,
            totalDetections: 0,
            maxCollisionsPerSecond: 0,
            maxDetectionsPerSecond: 0,
            maxPerSecond: {
                times: [],
                collisions: [],
                detections: []
            },
            chartData: {
                labels: [],
                datasets: []
            },
            suggestedMax: 5
        }
        defaults.global.animation = false;
    }

    componentDidMount() {
        setInterval(() => {
            const maxCollisionsPerSecond = this.state.maxCollisionsPerSecond;
            const maxDetectionsPerSecond = this.state.maxDetectionsPerSecond;

            // track per second
            this.state.maxPerSecond.times.push(new Date().toLocaleTimeString('it-IT'));
            this.state.maxPerSecond.collisions.push(maxCollisionsPerSecond);
            this.state.maxPerSecond.detections.push(maxDetectionsPerSecond);
            if (this.state.maxPerSecond.times.length > 10) {
                this.state.maxPerSecond.times.shift();
                this.state.maxPerSecond.collisions.shift();
                this.state.maxPerSecond.detections.shift();
            }

            this.setState({
                totalCollisions: this.state.totalCollisions + maxCollisionsPerSecond,
                totalDetections: this.state.totalDetections + maxDetectionsPerSecond
            }, () => {
                this.setState({
                    maxCollisionsPerSecond: 0,
                    maxDetectionsPerSecond: 0
                }, () => {
                    this.updateChart();
                })
            });
        }, 1000);
    }

    componentDidUpdate(prevProps) {
        // update the metrics
        if (this.props.collisions !== prevProps.collisions || this.props.detections !== prevProps.detections) {
            const maxCollisionsPerSecond = this.state.maxCollisionsPerSecond;
            const maxDetectionsPerSecond = this.state.maxDetectionsPerSecond;
            this.setState({
                maxCollisionsPerSecond: this.props.collisions > maxCollisionsPerSecond ? this.props.collisions : maxCollisionsPerSecond,
                maxDetectionsPerSecond: this.props.detections > maxDetectionsPerSecond ? this.props.detections : maxDetectionsPerSecond,
                suggestedMax: this.state.suggestedMax < maxDetectionsPerSecond ? maxDetectionsPerSecond : this.state.suggestedMax
            });
        }
    }

    render() {
        return (
            <React.Fragment>
                <div
                    style={{
                        width: this.state.width,
                        height: this.state.height,
                        padding: 10
                    }}
                >
                    <Line redraw
                        data={this.state.chartData}
                        options={{
                            maintainAspectRatio: true,
                            legend: {
                                display: true,
                                position: 'bottom'
                            },
                            layout: {
                                padding: {
                                    left: 10,
                                    right: 0,
                                    top: 0,
                                    bottom: 0
                                }
                            },
                            title: {
                                display: true,
                                text: 'Count of people vs Time'
                            },
                            scales: {
                                yAxes: [{
                                    display: true,
                                    ticks: {
                                        suggestedMin: 0,
                                        beginAtZero: 0,
                                        suggestedMax: this.state.suggestedMax
                                    }
                                }]
                            }
                        }}
                    />
                </div>
            </React.Fragment>
        );
    }

    updateChart = () => {
        if (this.state.maxPerSecond.times.length > 0) {
            const chartData = {
                labels: this.state.maxPerSecond.times,
                datasets: [{
                    label: 'Max people detections in frame per second',
                    data: this.state.maxPerSecond.detections,
                    backgroundColor: [
                        'transparent'
                    ],
                    borderColor: [
                        'lightblue'
                    ],
                    borderWidth: 1
                }, {
                    label: 'Max people detections in zones per second',
                    data: this.state.maxPerSecond.collisions,
                    backgroundColor: [
                        'transparent'
                    ],
                    borderColor: [
                        'yellow'
                    ],
                    borderWidth: 2
                }]
            };
            this.setState({
                chartData: chartData
            });
        }
    }
}