export class Collision {
    constructor(useCppCollision) {
        this.useCppCollision = useCppCollision;
    }

    toFloatArr(arr) {
        const res = new Float32Array(arr.length);
        for (let i = 0; i < arr.length; i++) {
            res[i] = arr[i];
        }
        return res;
    }

    transferToHeap(arr) {
        const floatArray = this.toFloatArr(arr);
        let heapSpace = window.Module._malloc(floatArray.length * floatArray.BYTES_PER_ELEMENT); // 1
        window.Module.HEAPF32.set(floatArray, heapSpace >> 2);
        return heapSpace;
    }

    bboxTo2dArray(bbox) {
        return [
            bbox[0], bbox[1],
            bbox[2], bbox[1],
            bbox[2], bbox[3],
            bbox[0], bbox[3],
            bbox[0], bbox[1]
        ];
    }

    polygonTo2dArray(polygon) {
        const points = [];
        const l = polygon.length;
        if (l > 0) {
            for (let i = 0; i < l; i++) {
                const point = polygon[i];
                points.push(point[0]);
                points.push(point[1]);
            }
            points.push(polygon[0][0]);
            points.push(polygon[0][1]);
        }
        return points;
    }

    isBBoxInZoneCpp(bbox, zone) {
        let result = false;
        let bboxOnHeap;
        let zoneOnHeap;
        try {
            bboxOnHeap = this.transferToHeap(bbox);
            zoneOnHeap = this.transferToHeap(zone);
            result = window.Module._isBBoxInZone(bboxOnHeap, zoneOnHeap, zone.length / 2);
            window.Module._free(bboxOnHeap);
            window.Module._free(zoneOnHeap);
        } catch (e) {
            window.Module._free(bboxOnHeap);
            window.Module._free(zoneOnHeap);
        }
        return result;
    }

    isBBoxInZones = (bbox, zones) => {
        const l = zones.length;
        for (let i = 0; i < l; i++) {
            const zone = zones[i];
            if (this.useCppCollision) {
                if (this.isBBoxInZoneCpp(this.bboxTo2dArray(bbox), this.polygonTo2dArray(zone.polygon))) {
                    return true;
                }
            } else {
                if (this.isBBoxInZoneJS(this.bboxToPolygon(bbox), zone)) {
                    return true;
                }
            }
        }
        return false;
    }

    // backup javascript implementation of collision detection

    bboxToPolygon(bbox) {
        return [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[1]],
            [bbox[2], bbox[3]],
            [bbox[0], bbox[3]],
            [bbox[0], bbox[1]],
        ];
    }

    isBBoxInZoneJS = (bbox, zone) => {
        const polygon = [];
        const zl = zone.polygon.length;
        if (zl > 0) {
            for (let i = 0; i < zl; i++) {
                polygon.push({ x: zone.polygon[i][0], y: zone.polygon[i][1] });
            }
            const bl = bbox.length;
            for (let i = 1; i < bl; i++) {
                const point = { x: bbox[i][0], y: bbox[0][1] };
                if (this.isPointInPolygon(point, polygon)) {
                    return true;
                }
            }
            if (bl > 1 && polygon.length > 1 && this.doAnyLinesIntersect(bbox, polygon)) {
                return true;
            }
            if (bl > 1 && this.isZoneInBBoxJS(zone, bbox)) {
                return true;
            }
        }
        return false;
    }

    isZoneInBBoxJS = (zone, bbox) => {
        const polygon = [];
        const bl = bbox.length;
        for (let i = 0; i < bl; i++) {
            polygon.push({ x: bbox[i][0], y: bbox[i][1] });
        }
        const zl = zone.polygon.length;
        for (let i = 1; i < zl; i++) {
            const point = { x: zone.polygon[i][0], y: zone.polygon[0][1] };
            if (this.isPointInPolygon(point, polygon)) {
                return true;
            }
        }
        return false;
    }

    doAnyLinesIntersect = (bbox, polygon) => {
        let l = polygon.length;
        for (let i = 1; i < l; i++) {
            const from1 = polygon[i - 1];
            const to1 = polygon[i];
            let l2 = bbox.length;
            for (let j = 1; j < l2; j++) {
                const from2 = { x: bbox[j - 1][0], y: bbox[j - 1][1] };
                const to2 = { x: bbox[j][0], y: bbox[j][1] };
                if (this.doLinesIntersect(from1, to1, from2, to2) !== undefined) {
                    return true;
                }
            }
        }

        return false;
    }

    doLinesIntersect = (from1, to1, from2, to2) => {
        const dX = to1.x - from1.x;
        const dY = to1.y - from1.y;

        const determinant = dX * (to2.y - from2.y) - (to2.x - from2.x) * dY;
        if (determinant === 0) return undefined; // parallel lines

        const lambda = ((to2.y - from2.y) * (to2.x - from1.x) + (from2.x - to2.x) * (to2.y - from1.y)) / determinant;
        const gamma = ((from1.y - to1.y) * (to2.x - from1.x) + dX * (to2.y - from1.y)) / determinant;

        // check if there is an intersection
        if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) return undefined;

        return {
            x: from1.x + lambda * dX,
            y: from1.y + lambda * dY,
        };
    }

    isPointInPolygon(p, polygon) {
        let isInside = false;
        if (polygon.length > 0) {
            let minX = polygon[0].x;
            let maxX = polygon[0].x;
            let minY = polygon[0].y;
            let maxY = polygon[0].y;
            for (let n = 1; n < polygon.length; n++) {
                const q = polygon[n];
                minX = Math.min(q.x, minX);
                maxX = Math.max(q.x, maxX);
                minY = Math.min(q.y, minY);
                maxY = Math.max(q.y, maxY);
            }

            if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
                return false;
            }

            let i = 0, j = polygon.length - 1;
            for (i, j; i < polygon.length; j = i++) {
                if ((polygon[i].y > p.y) !== (polygon[j].y > p.y) &&
                    p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x) {
                    isInside = !isInside;
                }
            }
        }

        return isInside;
    }
}