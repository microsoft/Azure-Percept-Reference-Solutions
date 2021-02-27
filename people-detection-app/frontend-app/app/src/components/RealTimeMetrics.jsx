import React from 'react';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { Text } from 'office-ui-fabric-react/lib/Text';

export class RealTimeMetrics extends React.Component {
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
            maxDetectionsPerSecond: 0
        }
    }

    componentDidMount() {
        setInterval(() => {
            const maxCollisionsPerSecond = this.state.maxCollisionsPerSecond;
            const maxDetectionsPerSecond = this.state.maxDetectionsPerSecond;

            this.setState({
                totalCollisions: this.state.totalCollisions + maxCollisionsPerSecond,
                totalDetections: this.state.totalDetections + maxDetectionsPerSecond
            }, () => {
                this.setState({
                    maxCollisionsPerSecond: 0,
                    maxDetectionsPerSecond: 0
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
                maxDetectionsPerSecond: this.props.detections > maxDetectionsPerSecond ? this.props.detections : maxDetectionsPerSecond
            });
        }
    }

    render() {
        const names = this.props.aggregator.zones.map((zone, index) => {
            return (
                <span key={index}>{index > 0 ? ', ' : null}{zone.name}</span>
            )
        });
        return (
            <React.Fragment>
                <div
                    style={{
                        margin: 10
                    }}
                >
                    <div>
                        <Label style={{fontWeight: 'bold'}}>Real time metrics</Label>
                    </div>
                    <Text variant={'medium'} block>
                        People detections in frame
                    </Text>
                    <Text variant={'medium'} block>
                        <b>{this.props.detections}</b>
                    </Text>
                    <Text variant={'medium'} block>
                        People detections in zones ({names})
                    </Text>
                    <Text variant={'medium'} block>
                        <b>{this.props.collisions}</b>
                    </Text>
                    <Text variant={'medium'} block>
                        Max people detections in frame per second
                    </Text>
                    <Text variant={'medium'} block>
                        <b>{this.state.maxDetectionsPerSecond}</b>
                    </Text>
                    <Text variant={'medium'} block>
                        Max people detections in zones ({names}) per second
                    </Text>
                    <Text variant={'medium'} block>
                        <b>{this.state.maxCollisionsPerSecond}</b>
                    </Text>
                </div>
            </React.Fragment>
        );
    }
}