#include <stdio.h>
#include <vector>
#include <algorithm>

using namespace std;

class Point
{
public:
    float X, Y;
    Point(float x, float y)
    {
        X = x;
        Y = y;
    }
};

class Polygon
{
public:
    vector<Point> points;
};

bool doLinesIntersect(Point from1, Point to1, Point from2, Point to2) {
    float dX = to1.X - from1.X;
    float dY = to1.Y - from1.Y;

    float determinant = dX * (to2.Y - from2.Y) - (to2.X - from2.X) * dY;
    if(determinant == 0) {
        return false;
    }

    float lambda = ((to2.Y - from2.Y) * (to2.X - from1.X) + (from2.X - to2.X) * (to2.Y - from1.Y)) / determinant;
    float gamma = ((from1.Y - to1.Y) * (to2.X - from1.X) + dX * (to2.Y - from1.Y)) / determinant;

    if (!(0 <= lambda && lambda <= 1) || !(0 <= gamma && gamma <= 1)) {
        return false;
    }

    return true;
}

bool doAnyLinesIntersect(Polygon bbox, Polygon zone) {
    int s = zone.points.size();
    for(int i=1; i<s; i++) {
        Point from1(zone.points[i-1].X, zone.points[i-1].Y);
        Point to1(zone.points[i].X, zone.points[i].Y);
        int s2 = bbox.points.size();
        for(int j=1; j<s2; j++) {
            Point from2(bbox.points[j-1].X, bbox.points[j-1].Y);
            Point to2(bbox.points[j].X, bbox.points[j].Y);
            if(doLinesIntersect(from1, to1, from2, to2)) {
                return true;
            }
        }
    }
    return false;
}

bool isPointInPolygon(Point point, Polygon polygon)
{
    bool isInside = false;
    float minX = polygon.points[0].X;
    float maxX = polygon.points[0].X;
    float minY = polygon.points[0].Y;
    float maxY = polygon.points[0].Y;

    int s = polygon.points.size();
    for (int i = 0; i < s; i++)
    {
        minX = min(polygon.points[i].X, minX);
        maxX = max(polygon.points[i].X, maxX);
        minY = min(polygon.points[i].Y, minY);
        maxY = max(polygon.points[i].Y, maxY);
    }

    if (point.X < minX || point.X > maxX || point.Y < minY || point.Y > maxY)
    {
        return false;
    }

    int i, j;
    for (i = 0, j = s - 1; i < s; j = i++)
    {
        if ((polygon.points[i].Y > point.Y) != (polygon.points[j].Y > point.Y) &&
            point.X < (polygon.points[j].X - polygon.points[i].X) * (point.Y - polygon.points[i].Y) / (polygon.points[j].Y - polygon.points[i].Y) + polygon.points[i].X)
        {
            isInside = !isInside;
        }
    }

    return isInside;
}

extern "C"
{
    bool isBBoxInZone(
        float bboxValues[],
        float zoneValues[],
        int zoneSize)
    {
        Polygon bbox;
        for (int i = 0; i < 10;)
        {
            Point point(bboxValues[i], bboxValues[i + 1]);
            bbox.points.push_back(point);
            i = i + 2;
        }
        Polygon zone;
        for (int i = 0; i < zoneSize * 2;)
        {
            Point point(zoneValues[i], zoneValues[i + 1]);
            zone.points.push_back(point);
            i = i + 2;
        }

        int s = bbox.points.size();
        for (int i = 0; i < s; i++)
        {
            if (isPointInPolygon(bbox.points[i], zone))
            {
                return true;
            }
        }

        if(bbox.points.size() > 1 && zone.points.size() > 1 && doAnyLinesIntersect(bbox, zone)) {
            return true;
        }

        return false;
    }
}
int main()
{
    printf("Collision...\n");
}