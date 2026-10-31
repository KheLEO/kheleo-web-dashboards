import { describe, expect, it } from "vitest";
import { jointAngle, type Landmark } from "@/features/drills/joint-angles";
import { parseCentroid } from "@/features/regional/centroid-parser";
const point = (x: number, y: number, visibility = 1): Landmark => ({ x, y, z: 0, visibility });
describe("pose geometry", () => {
  it("computes a right angle and a straight angle", () => {
    expect(jointAngle(point(1, 0), point(0, 0), point(0, 1))).toBeCloseTo(90);
    expect(jointAngle(point(-1, 0), point(0, 0), point(1, 0))).toBeCloseTo(180);
  });
  it("rejects degenerate and insufficiently visible joints", () => {
    expect(jointAngle(point(0, 0), point(0, 0), point(1, 0))).toBeNull();
    expect(jointAngle(point(1, 0, 0.1), point(0, 0), point(0, 1))).toBeNull();
    expect(jointAngle(point(NaN, 0), point(0, 0), point(0, 1))).toBeNull();
  });
});
describe("geospatial projection", () => {
  it("converts GeoJSON longitude/latitude to Leaflet latitude/longitude", () => {
    expect(parseCentroid({ type: "Point", coordinates: [82, 25] })).toEqual([25, 82]);
  });
  it.each([
    null,
    {},
    { type: "Polygon", coordinates: [] },
    { type: "Point", coordinates: [200, 25] },
    { type: "Point", coordinates: [25, NaN] },
  ])("rejects invalid centroids %j", (centroid) => {
    expect(parseCentroid(centroid)).toBeNull();
  });
});
