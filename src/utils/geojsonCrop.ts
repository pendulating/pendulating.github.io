/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Filter GeoJSON features to only include those within a bounding polygon
 */
export function cropGeojsonByPolygon(
  geojson: any,
  boundingPolygon: any
): any {
  if (!geojson || !boundingPolygon) {
    return geojson;
  }

  // Extract polygon coordinates
  let polygonCoords: [number, number][];
  if (boundingPolygon.type === "Polygon") {
    polygonCoords = boundingPolygon.coordinates[0]; // Outer ring
  } else if (boundingPolygon.type === "MultiPolygon") {
    // Use first polygon's outer ring
    polygonCoords = boundingPolygon.coordinates[0][0];
  } else {
    console.warn("Bounding polygon must be Polygon or MultiPolygon");
    return geojson;
  }

  // Handle FeatureCollection
  if (geojson.type === "FeatureCollection") {
    return {
      ...geojson,
      features: geojson.features.filter((feature: any) => {
        return isFeatureInPolygon(feature.geometry, polygonCoords);
      }),
    };
  }

  // Handle single Feature
  if (geojson.type === "Feature") {
    if (isFeatureInPolygon(geojson.geometry, polygonCoords)) {
      return geojson;
    }
    return null;
  }

  // Handle geometry directly
  if (isFeatureInPolygon(geojson, polygonCoords)) {
    return geojson;
  }

  return null;
}

/**
 * Check if a geometry intersects with a polygon
 */
function isFeatureInPolygon(
  geometry: any,
  polygonCoords: [number, number][]
): boolean {
  if (!geometry) return false;

  switch (geometry.type) {
    case "Point":
      return pointInPolygon(geometry.coordinates, polygonCoords);

    case "MultiPoint":
      return geometry.coordinates.some((coord: [number, number]) =>
        pointInPolygon(coord, polygonCoords)
      );

    case "LineString":
      return geometry.coordinates.some((coord: [number, number]) =>
        pointInPolygon(coord, polygonCoords)
      );

    case "MultiLineString":
      return geometry.coordinates.some((line: [number, number][]) =>
        line.some((coord) => pointInPolygon(coord, polygonCoords))
      );

    case "Polygon":
      return geometry.coordinates[0].some((coord: [number, number]) =>
        pointInPolygon(coord, polygonCoords)
      );

    case "MultiPolygon":
      return geometry.coordinates.some((polygon: [number, number][][]) =>
        polygon[0].some((coord) => pointInPolygon(coord, polygonCoords))
      );

    default:
      return false;
  }
}

