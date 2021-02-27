import React from 'react';
import { Label } from 'office-ui-fabric-react/lib/Label';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import { IconButton } from '@fluentui/react/lib/Button';
import { Icon } from '@fluentui/react/lib/Icon';

export class EditZones extends React.Component {
    static defaultProps = {
        aggregator: {
            lines: [],
            zones: [{
                name: "queue",
                polygon: [],
                threshold: 10.0
            }]
        },
        selectedZoneIndex: 0
    }

    constructor(props) {
        super(props);
        this.state = {
            aggregator: JSON.parse(JSON.stringify(this.props.aggregator)),
            selectedZoneIndex: this.props.selectedZoneIndex
        }
    }

    componentDidUpdate(prevProps) {
        if (prevProps.aggregator !== this.props.aggregator) {
            this.setState({
                aggregator: this.props.aggregator
            })
        }
        if (prevProps.selectedZoneIndex !== this.props.selectedZoneIndex) {
            this.setState({
                selectedZoneIndex: this.props.selectedZoneIndex
            })
        }
    }

    render() {
        return (
            <React.Fragment>
                <div
                    style={{
                        margin: 10
                    }}
                >
                    <div>
                        <Label style={{ fontWeight: 'bold' }}>Zones</Label>
                    </div>
                    <form>
                        <table style={{width: '100%'}}>
                            <tbody>
                                {
                                    this.state.aggregator.zones.map((zone, index) => {
                                        return (
                                            <tr key={index}
                                                style={{
                                                    backgroundColor: `${this.state.aggregator.zones.indexOf(zone) === this.state.selectedZoneIndex ? '#ddd' : 'transparent'}`
                                                }}>
                                                <td>
                                                    <TextField
                                                        defaultValue={zone.name}
                                                        onChange={(e) => {
                                                            this.state.aggregator.zones[index].name = e.target.value;
                                                            this.props.updateAggregator(this.state.aggregator);
                                                        }}
                                                        onMouseDown={(e) => {
                                                            const i = this.state.aggregator.zones.indexOf(zone);
                                                            this.props.updateSelectedZoneIndex(i);
                                                        }}
                                                    />
                                                </td>
                                                <td style={{width: 14}}>
                                                    <IconButton
                                                        onClick={(e) => {
                                                            const i = this.state.aggregator.zones.indexOf(zone);
                                                            this.state.aggregator.zones[i].polygon = [];
                                                            this.props.updateAggregator(this.state.aggregator);
                                                        }}
                                                    >
                                                        <Icon iconName="Clear" />
                                                    </IconButton>
                                                </td>
                                                <td style={{width: 14}}>
                                                    <IconButton
                                                        onClick={(e) => {
                                                            const i = this.state.aggregator.zones.indexOf(zone);
                                                            this.state.aggregator.zones.splice(i, 1);
                                                            this.props.updateAggregator(this.state.aggregator);
                                                            this.props.updateSelectedZoneIndex(-1);
                                                        }}
                                                    >
                                                        <Icon iconName="Delete" />
                                                    </IconButton>
                                                </td>
                                            </tr>
                                        )
                                    })
                                }
                                <tr>
                                    <td colSpan={3} align="right">
                                        <IconButton
                                            onClick={(e) => {
                                                this.state.aggregator.zones.push({
                                                    name: "",
                                                    polygon: [],
                                                    threshold: 0.0
                                                });
                                                this.props.updateAggregator(this.state.aggregator);
                                                this.props.updateSelectedZoneIndex(this.state.aggregator.zones.length - 1);
                                            }}
                                        >
                                            <Icon iconName="Add" />
                                        </IconButton>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </form>
                </div>
            </React.Fragment>
        );
    }
}