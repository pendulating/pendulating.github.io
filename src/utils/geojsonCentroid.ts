/**
 * Compute the centroid of various GeoJSON geometry types
 */

interface Point {
  type: "Point";
  coordinates: [number, number];
}

interface LineString {
  type: "LineString";
  coordinates: [number, number][];
}

interface Polygon {
  type: "Polygon";
  coordinates: [number, number][][];
}

interface MultiPoint {
  type: "MultiPoint";
  coordinates: [number, number][];
}

interface MultiLineString {
  type: "MultiLineString";
  coordinates: [number, number][][];
}

interface MultiPolygon {
  type: "MultiPolygon";
  coordinates: [number, number][][][];
}

type GeoJSONGeometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon;

/**
 * Compute centroid from an array of coordinates
 */
function computeCentroidFromPoints(points: [number, number][]): [number, number] {
  if (points.length === 0) {
    throw new Error("Cannot compute centroid of empty point array");
  }

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of points) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / points.length, sumLat / points.length];
}

/**
 * Extract all points from a polygon (including holes)
 */
function getPolygonPoints(polygon: [number, number][][]): [number, number][] {
  // Just use the outer ring (first array) for centroid calculation
  return polygon[0];
}

/**
 * Compute the centroid of a GeoJSON geometry
 * Returns [longitude, latitude]
 */
export function computeGeojsonCentroid(geometry: GeoJSONGeometry): [number, number] {
  switch (geometry.type) {
    case "Point":
      return geometry.coordinates;

    case "MultiPoint":
      return computeCentroidFromPoints(geometry.coordinates);

    case "LineString":
      return computeCentroidFromPoints(geometry.coordinates);

    case "MultiLineString": {
      // Flatten all line segments into one array
      const allPoints = geometry.coordinates.flat();
      return computeCentroidFromPoints(allPoints);
    }

    case "Polygon": {
      const points = getPolygonPoints(geometry.coordinates);
      return computeCentroidFromPoints(points);
    }

    case "MultiPolygon": {
      // Get all points from all polygons
      const allPoints = geometry.coordinates.flatMap((polygon) =>
        getPolygonPoints(polygon)
      );
      return computeCentroidFromPoints(allPoints);
    }

    default:
      throw new Error(`Unsupported geometry type: ${(geometry as any).type}`);
  }
}

/**
 * Extract coordinates from a project's geojson or fallback to manual coordinates
 * If boundingPolygon exists, use its centroid; otherwise compute from geojson
 */
export function getProjectCoordinates(project: {
  geojson?: GeoJSONGeometry;
  boundingPolygon?: GeoJSONGeometry;
  coordinates?: { latitude: number; longitude: number };
}): [number, number] | null {
  // Prefer boundingPolygon centroid if available (shows where the crop is)
  if (project.boundingPolygon) {
    try {
      return computeGeojsonCentroid(project.boundingPolygon);
    } catch (error) {
      console.error("Error computing centroid from boundingPolygon:", error);
    }
  }

  // Try geojson if available
  if (project.geojson) {
    try {
      return computeGeojsonCentroid(project.geojson);
    } catch (error) {
      console.error("Error computing centroid from geojson:", error);
    }
  }

  // Fallback to manual coordinates
  if (project.coordinates) {
    return [project.coordinates.longitude, project.coordinates.latitude];
  }

  return null;
}

