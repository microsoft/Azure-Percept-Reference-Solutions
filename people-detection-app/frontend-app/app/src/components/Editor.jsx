import React from 'react';
import { ChoiceGroup } from 'office-ui-fabric-react/lib/ChoiceGroup';

export class Editor extends React.Component {
    static defaultProps = {
        border: '0px solid black',
        width: 300,
        height: 300,
        fps: 30,
        editingAllowed: true,
        aggregator: {
            lines: [],
            zones: []
        }
    }
    constructor(props) {
        super(props);
        this.state = {
            aggregator: JSON.parse(JSON.stringify(this.props.aggregator)),
            selectedZoneIndex: 0,
            selectedEdgeIndices: [-1, -1],
            selectedPointIndex: -1,
            selectedPointRadius: 0.025,
            editBy: "point"
        };

        this.canvasRef = React.createRef();
        this.editByRef = React.createRef();
        this.mousePos = { x: 0, y: 0 };
        this.dragAnchorPoint = { x: 0, y: 0 };
        this.mouseInside = false;
        this.dragging = false;
    }

    componentDidMount() {
        setInterval(() => {
            this.draw();
        }, 1000 / this.props.fps);
    }

    componentDidUpdate(prevProps) {
        if (prevProps.aggregator !== this.props.aggregator) {
            this.setState({
                aggregator: this.props.aggregator
            });
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
                        textAlign: 'center',
                        width: this.props.width,
                        position: 'absolute',
                        zIndex: 12
                    }}
                    onMouseOver={this.handleMouseOver}
                    onMouseOut={this.handleMouseOut}
                >
                    <canvas
                        ref={this.canvasRef}
                        width={this.props.width}
                        height={this.props.height}
                        style={{
                            border: this.props.border
                        }}
                        tabIndex={-1}
                        onKeyUp={this.handleKeyUp}
                        onClick={this.handleMouseClick}
                        onMouseDown={this.handleMouseDown}
                        onMouseUp={this.handleMouseUp}
                        onMouseMove={this.handleMouseMove}
                    />
                    <ChoiceGroup
                        ref={this.editByRef}
                        selectedKey={this.state.editBy}
                        options={[
                            { key: 'point', text: 'point', styles: { field: { margin: 10 } } },
                            { key: 'edge', text: 'edge', styles: { field: { margin: 10 } } },
                            { key: 'shape', text: 'shape', styles: { field: { margin: 10 } } },
                        ]}
                        onChange={(e, option) => {
                            this.setState({
                                editBy: option.key
                            });
                        }}
                        style={{ 
                            position: 'absolute',
                            right: 0,
                            visibility: this.mouseInside ? 'visible' : 'hidden' }}
                        styles={{ flexContainer: { display: 'flex' } }}
                    />
                </div>
            </React.Fragment>
        );
    }

    handleMouseOver = (e) => {
        if(this.props.editingAllowed) {
            this.canvasRef.current.focus();
            this.dragging = false;
            this.mouseInside = true;
            this.setState({
                selectedPointIndex: -1,
                selectedEdgeIndices: [-1, -1]
            });
        }
    }

    handleMouseOut = (e) => {
        if(this.props.editingAllowed) {
            this.dragging = false;
            this.mouseInside = false;
            this.setState({
                selectedPointIndex: -1,
                selectedEdgeIndices: [-1, -1]
            });
            this.props.updateAggregator(this.state.aggregator);
        }
    }

    handleKeyUp = (e) => {
        if(this.props.editingAllowed) {
            if (e.keyCode === 45) {
                this.insertPoint();
            } else if (e.keyCode === 46) {
                this.removePoint();
            } if (e.keyCode === 49 || e.keyCode === 97) {
                this.setState({
                    editBy: "point"
                }, () => {
                    this.editByRef.current.selectedKey = this.state.editBy;
                });
            } else if (e.keyCode === 50 || e.keyCode === 98) {
                this.setState({
                    editBy: "edge"
                }, () => {
                    this.editByRef.current.selectedKey = this.state.editBy;
                });
            } else if (e.keyCode === 51 || e.keyCode === 99) {
                this.setState({
                    editBy: "shape"
                }, () => {
                    this.editByRef.current.selectedKey = this.state.editBy;
                });
            }
        }
    }

    handleMouseDown = (e) => {
        if(this.props.editingAllowed) {
            if (!this.dragging && this.canvasRef.current && this.state.selectedZoneIndex !== -1) {
                const rect = this.canvasRef.current?.getBoundingClientRect();
                const x = this.clamp((e.clientX - rect.left) / this.props.width, 0, 1);
                const y = this.clamp((e.clientY - rect.top) / this.props.height, 0, 1);
    
                this.dragAnchorPoint = { x: x, y: y };
            }
            this.dragging = true;
            this.updateMousePos(e);
            this.forceUpdate();
        }
    }

    handleMouseUp = (e) => {
        if(this.props.editingAllowed) {
            this.dragging = false;
        }
    }

    handleMouseMove = (e) => {
        if(this.props.editingAllowed) {
            this.updateMousePos(e);
            if (this.state.editBy === "point") {
                this.movePoint(e);
            } else if (this.state.editBy === "edge") {
                this.moveEdge(e);
            } else if (this.state.editBy === "shape") {
                this.moveShape(e);
            }
        }
    }

    handleMouseClick = (e) => {
        if (this.props.editingAllowed && this.state.editBy === "point") {
            this.addPoint(e);
        }
    }

    updateMousePos = (e) => {
        if (this.canvasRef.current) {
            const rect = this.canvasRef.current?.getBoundingClientRect();
            const x = this.clamp((e.clientX - rect.left) / this.props.width, 0, 1);
            const y = this.clamp((e.clientY - rect.top) / this.props.height, 0, 1);
            this.mousePos = { x: x, y: y };
            this.forceUpdate();
        }
    }

    // edit points
    addPoint = (e) => {
        if (this.canvasRef.current && this.state.selectedPointIndex === -1) {
            const rect = this.canvasRef.current?.getBoundingClientRect();
            const x = this.clamp((e.clientX - rect.left) / this.props.width, 0, 1);
            const y = this.clamp((e.clientY - rect.top) / this.props.height, 0, 1);
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.push([x, y]);
        }
    }

    insertPoint = () => {
        if (
            this.canvasRef.current &&
            this.state.selectedZoneIndex !== -1 &&
            this.state.selectedPointIndex !== -1 &&
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.length > 1
        ) {
            const point = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[this.state.selectedPointIndex];

            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.splice(this.state.selectedPointIndex, 0, [point[0], point[1]]);

            this.setState({
                selectedPointIndex: -1
            });
        }
    }

    movePoint = (e) => {
        if (
            this.dragging &&
            this.state.selectedZoneIndex !== -1 &&
            this.state.selectedPointIndex !== -1 &&
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.length > this.state.selectedPointIndex
        ) {
            // eslint-disable-next-line react/no-direct-mutation-state
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[this.state.selectedPointIndex] = [this.mousePos.x, this.mousePos.y];
        }
    }

    removePoint = () => {
        if (
            this.state.selectedZoneIndex !== -1 &&
            this.state.selectedPointIndex !== -1 &&
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.length > this.state.selectedPointIndex
        ) {
            this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.splice(this.state.selectedPointIndex, 1);
            this.setState({
                selectedPointIndex: -1
            });
        }
    }

    findNearestPoint = (point) => {
        let nearestPointIndex = -1;
        let nearestPointDistance = -1;
        const l = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.length;
        for (let i = 0; i < l; i++) {
            const p = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[i];
            const distance = Math.hypot(point.x - p[0], point.y - p[1]);
            if (distance <= nearestPointDistance || nearestPointDistance === -1) {
                nearestPointDistance = distance;
                nearestPointIndex = i;
            }
        }
        return nearestPointDistance < this.state.selectedPointRadius ? nearestPointIndex : -1;
    }

    distanceFromPointToLineSegment = (point, start, end) => {
        let l2 = Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2);
        if (l2 == 0) {
            return Math.pow(point.x - start.x, 2) + Math.pow(point.y - start.y, 2);
        }
        const t = Math.max(0, Math.min(1, ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) / l2));

        return Math.sqrt(Math.pow(point.x - (start.x + t * (end.x - start.x)), 2) + Math.pow(point.y - (start.y + t * (end.y - start.y)), 2));
    }

    findNearestEdge = (point) => {
        let edges = [];
        let selectedEdge = [-1, -1];
        const zone = this.state.aggregator.zones[this.state.selectedZoneIndex];
        const pl = zone.polygon.length;
        if (pl > 1) {
            for (let p = 0; p < pl; p++) {
                if (p < pl - 1) {
                    // first and inbetween            
                    const start = {
                        x: zone.polygon[p][0],
                        y: zone.polygon[p][1]
                    };
                    const end = {
                        x: zone.polygon[p + 1][0],
                        y: zone.polygon[p + 1][1]
                    };
                    edges.push({
                        indices: [p, p + 1],
                        distance: this.distanceFromPointToLineSegment(point, start, end)
                    });
                } else {
                    // last         
                    const start = {
                        x: zone.polygon[p][0],
                        y: zone.polygon[p][1]
                    };
                    const end = {
                        x: zone.polygon[0][0],
                        y: zone.polygon[0][1]
                    };
                    edges.push({
                        indices: [p, 0],
                        distance: this.distanceFromPointToLineSegment(point, start, end)
                    });
                }
            }
            edges = edges.sort((a, b) => {
                return a.distance > b.distance ? 1 : -1
            });

            if (edges.length > 0 && edges[0].distance < 0.05) {
                selectedEdge = edges[0].indices;
            }
        }

        return selectedEdge;
    }

    selectPoint = () => {
        if (this.state.selectedZoneIndex !== -1) {
            const nearestPointIndex = this.findNearestPoint({ x: this.mousePos.x, y: this.mousePos.y });

            if (nearestPointIndex !== this.state.selectedPointIndex) {
                this.setState({
                    selectedPointIndex: nearestPointIndex
                });
            }
        }
    }

    // edit edge
    selectEdge = () => {
        if (this.state.selectedZoneIndex !== -1) {
            const selectedEdgeIndices = this.findNearestEdge({ x: this.mousePos.x, y: this.mousePos.y });

            if (selectedEdgeIndices[0] !== this.state.selectedEdgeIndices[0] &&
                selectedEdgeIndices[1] !== this.state.selectedEdgeIndices[1]
            ) {
                this.setState({
                    selectedEdgeIndices: selectedEdgeIndices
                });
            }
        }
    }

    moveEdge = (e) => {
        if (this.dragging && this.canvasRef.current && this.state.selectedZoneIndex !== -1) {
            const distanceX = this.mousePos.x - this.dragAnchorPoint.x;
            const distanceY = this.mousePos.y - this.dragAnchorPoint.y;
            this.dragAnchorPoint.x = this.mousePos.x;
            this.dragAnchorPoint.y = this.mousePos.y;

            const l = this.state.selectedEdgeIndices.length;
            for (let i = 0; i < l; i++) {
                const index = this.state.selectedEdgeIndices[i];
                const point = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[index];
                point[0] = point[0] + distanceX;
                point[1] = point[1] + distanceY;
            }
        }
    }

    // edit shape
    moveShape = (e) => {
        if (this.dragging && this.canvasRef.current && this.state.selectedZoneIndex !== -1) {
            const distanceX = this.mousePos.x - this.dragAnchorPoint.x;
            const distanceY = this.mousePos.y - this.dragAnchorPoint.y;
            this.dragAnchorPoint.x = this.mousePos.x;
            this.dragAnchorPoint.y = this.mousePos.y;

            const l = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon.length;
            for (let i = 0; i < l; i++) {
                const point = this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[i];
                point[0] = point[0] + distanceX;
                point[1] = point[1] + distanceY;
            }
        }
    }

    clamp = (value, min, max) => {
        return Math.min(Math.max(value, min), max);
    }

    draw = () => {
        const canvasContext = this.canvasRef.current?.getContext("2d");
        if (canvasContext) {
            canvasContext.clearRect(0, 0, this.props.width, this.props.height);
            this.drawZones(canvasContext, this.props.aggregator.zones);
            this.drawLines(canvasContext, this.props.aggregator.lines);
            if (this.mouseInside) {
                if (this.state.editBy === "point") {
                    this.selectPoint();
                    this.drawSelectedPoint(canvasContext);
                } else if (this.state.editBy === "edge") {
                    this.selectEdge();
                    this.drawSelectedEdge(canvasContext);
                } else if (this.state.editBy === "shape") {
                    if (this.state.selectedZoneIndex !== -1) {
                        const point = { x: this.mousePos.x, y: this.mousePos.y };
                        const zone = this.state.aggregator.zones[this.state.selectedZoneIndex];
                        const polygon = [];
                        let l = zone.polygon.length;
                        if (l > 0) {
                            for (let i = 0; i < l; i++) {
                                polygon.push({ x: zone.polygon[i][0], y: zone.polygon[i][1] });
                            }
                        }
                        if (this.props.collision.isPointInPolygon(point, polygon)) {
                            this.drawSelectedShape(canvasContext);
                        }
                    }
                }
            }
        }
    }

    drawZones = (canvasContext) => {
        canvasContext.strokeStyle = 'violet';
        canvasContext.lineWidth = 3;

        const zl = this.state.aggregator.zones.length;
        for (let z = 0; z < zl; z++) {
            const zone = this.state.aggregator.zones[z];
            const pl = zone.polygon.length;
            for (let p = 0; p < pl; p++) {
                if (p > 0) {
                    const start = {
                        x: this.props.width * zone.polygon[p - 1][0],
                        y: this.props.height * zone.polygon[p - 1][1]
                    };
                    const end = {
                        x: this.props.width * zone.polygon[p][0],
                        y: this.props.height * zone.polygon[p][1]
                    };
                    canvasContext.setLineDash([]);
                    canvasContext.beginPath();
                    canvasContext.moveTo(start.x, start.y);
                    canvasContext.lineTo(end.x, end.y);
                    canvasContext.closePath();
                    canvasContext.stroke();
                }
            }
            if (pl > 2) {
                const first = {
                    x: this.props.width * zone.polygon[0][0],
                    y: this.props.height * zone.polygon[0][1]
                };
                const last = {
                    x: this.props.width * zone.polygon[pl - 1][0],
                    y: this.props.height * zone.polygon[pl - 1][1]
                };
                if (this.state.selectedZoneIndex === z && this.mouseInside && this.state.editBy === "point") {
                    canvasContext.setLineDash([3, 5]);
                } else {
                    canvasContext.setLineDash([]);
                }
                canvasContext.beginPath();
                canvasContext.moveTo(last.x, last.y);
                canvasContext.lineTo(first.x, first.y);
                canvasContext.closePath();
                canvasContext.stroke();
            }
            if (this.state.selectedZoneIndex === z && this.mouseInside && this.state.editBy === "point") {
                for (let p = 0; p < pl; p++) {
                    const point = {
                        x: this.props.width * zone.polygon[p][0],
                        y: this.props.height * zone.polygon[p][1]
                    };
                    canvasContext.setLineDash([]);
                    canvasContext.beginPath();
                    canvasContext.arc(point.x, point.y, 5, 0, 2 * Math.PI);
                    canvasContext.closePath();
                    canvasContext.stroke();
                }
            }
        }
    }

    drawSelectedPoint = (canvasContext) => {
        if (this.state.selectedZoneIndex !== -1 && this.state.selectedPointIndex !== -1) {
            canvasContext.strokeStyle = 'yellow';
            canvasContext.lineWidth = 3;

            const point = {
                x: this.props.width * this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[this.state.selectedPointIndex][0],
                y: this.props.height * this.state.aggregator.zones[this.state.selectedZoneIndex].polygon[this.state.selectedPointIndex][1]
            };
            canvasContext.beginPath();
            canvasContext.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            canvasContext.stroke();
        }
    }

    drawSelectedEdge = (canvasContext) => {
        if (this.state.selectedZoneIndex !== -1 && this.state.selectedEdgeIndices[0] !== -1) {
            canvasContext.strokeStyle = 'yellow';
            canvasContext.lineWidth = 3;

            const zone = this.state.aggregator.zones[this.state.selectedZoneIndex];

            const index1 = this.state.selectedEdgeIndices[0];
            const index2 = this.state.selectedEdgeIndices[1];

            const start = {
                x: this.props.width * zone.polygon[index1][0],
                y: this.props.height * zone.polygon[index1][1]
            };
            const end = {
                x: this.props.width * zone.polygon[index2][0],
                y: this.props.height * zone.polygon[index2][1]
            };
            canvasContext.setLineDash([]);
            canvasContext.beginPath();
            canvasContext.moveTo(start.x, start.y);
            canvasContext.lineTo(end.x, end.y);
            canvasContext.closePath();
            canvasContext.stroke();
        }
    }

    drawSelectedShape = (canvasContext) => {
        if (this.state.selectedZoneIndex !== -1) {
            canvasContext.strokeStyle = 'yellow';
            canvasContext.lineWidth = 3;

            const zone = this.state.aggregator.zones[this.state.selectedZoneIndex];
            const pl = zone.polygon.length;
            for (let p = 0; p < pl; p++) {
                if (p > 0) {
                    const start = {
                        x: this.props.width * zone.polygon[p - 1][0],
                        y: this.props.height * zone.polygon[p - 1][1]
                    };
                    const end = {
                        x: this.props.width * zone.polygon[p][0],
                        y: this.props.height * zone.polygon[p][1]
                    };
                    canvasContext.setLineDash([]);
                    canvasContext.beginPath();
                    canvasContext.moveTo(start.x, start.y);
                    canvasContext.lineTo(end.x, end.y);
                    canvasContext.closePath();
                    canvasContext.stroke();
                }
            }
            if (pl > 2) {
                const first = {
                    x: this.props.width * zone.polygon[0][0],
                    y: this.props.height * zone.polygon[0][1]
                };
                const last = {
                    x: this.props.width * zone.polygon[pl - 1][0],
                    y: this.props.height * zone.polygon[pl - 1][1]
                };
                canvasContext.setLineDash([]);
                canvasContext.beginPath();
                canvasContext.moveTo(last.x, last.y);
                canvasContext.lineTo(first.x, first.y);
                canvasContext.closePath();
                canvasContext.stroke();
            }
        }
    }

    drawLines(canvasContext, lines) {
        let l = lines.length;
        for (let i = 0; i < l; i++) {
            const line = lines[i];
            this.drawLine(canvasContext, line);
        }
    }

    drawLine(canvasContext, line) {
        canvasContext.strokeStyle = 'violet';
        canvasContext.lineWidth = 3;

        let l = line.length;
        for (let i = 0; i < l; i++) {
            const point = {
                x: this.props.width * line[i][0],
                y: this.props.height * line[i][1]
            };
            if (i === 0) {
                canvasContext.moveTo(point.x, point.y);
            } else {
                canvasContext.lineTo(point.x, point.y);
            }
        }
        canvasContext.closePath();
        canvasContext.stroke();
    }
}
