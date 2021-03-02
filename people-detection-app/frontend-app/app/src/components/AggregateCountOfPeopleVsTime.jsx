import React from 'react';
import { defaults } from 'react-chartjs-2';
import { Line } from 'react-chartjs-2';

export class AggregateCountOfPeopleVsTime extends React.Component {
    static defaultProps = {
        aggregateChartMetrics: {
            times: [],
            collisions: [],
            detections: []
        }
    }

    constructor(props) {
        super(props);
        this.state = {
            metrics: {
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
        this.update()
    }

    componentDidUpdate(prevProps) {
        // update the metrics
        if (this.props.aggregateChartMetrics !== prevProps.aggregateChartMetrics) {
            this.update();
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
                                text: 'Aggregate count of people vs Time'
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

    update = () => {
        const aggregateChartMetrics = this.props.aggregateChartMetrics;
        let time = null;
        let metrics = {
            times: [],
            collisions: [],
            detections: []
        }
        let count = 0;
        let totalCount = 0;
        let d = 0;
        let c = 0;
        const l = aggregateChartMetrics.times.length;
        for (let i = 0; i < l; i++) {
            d = d + aggregateChartMetrics.detections[i];
            c = c + aggregateChartMetrics.collisions[i];
            count = count + 1;
            totalCount = totalCount + 1;
            if (count == 60) {
                metrics.times.push(new Date(aggregateChartMetrics.times[i]).toLocaleTimeString('it-IT'));
                metrics.collisions.push(c);
                metrics.detections.push(d);
                d = 0;
                c = 0;
                count = 0;
            }
        }
        if (totalCount < l) {
            for (let i = totalCount; i < l; i++) {
                d = d + aggregateChartMetrics.detections[i];
                c = c + aggregateChartMetrics.collisions[i];
                count = count + 1;
                totalCount = totalCount + 1;
                if (i == l - 1) {
                    metrics.times.push(new Date(aggregateChartMetrics.times[i]).toLocaleTimeString('it-IT'));
                    metrics.collisions.push(c);
                    metrics.detections.push(d);
                    break;
                }
            }
        }
        this.setState({
            metrics: metrics
        }, () => {
            this.updateChart();
        })
    }

    updateChart = () => {
        if (this.state.metrics.times.length > 0) {
            const chartData = {
                labels: this.state.metrics.times,
                datasets: [{
                    label: 'Max people detections in frame per minute',
                    data: this.state.metrics.detections,
                    backgroundColor: [
                        'transparent'
                    ],
                    borderColor: [
                        'lightblue'
                    ],
                    borderWidth: 1
                }, {
                    label: 'Max people detections in zones per minute',
                    data: this.state.metrics.collisions,
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