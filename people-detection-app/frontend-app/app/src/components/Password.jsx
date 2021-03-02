import React from 'react';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import 'office-ui-fabric-react/dist/css/fabric.css';

export class Password extends React.Component {
    static defaultProps = {
        updatePassword: () => { }
    }

    constructor(props) {
        super(props);
        this.state = {

        }
    }

    componentDidMount() {

    }

    componentDidUpdate() {

    }

    render() {
        return (
            <React.Fragment>
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    margin: 10,
                    padding: 10
                }}>
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row'
                        }}
                    >
                        <form>
                            <TextField
                                type="password"
                                autoComplete="password"
                                label="Enter password"
                                onChange={this.props.updatePassword}
                            />
                        </form>
                    </div>
                </div>
            </React.Fragment>
        );
    }
}