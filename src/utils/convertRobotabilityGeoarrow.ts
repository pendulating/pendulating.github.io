import type { Table } from 'apache-arrow';
import type { Feature, Polygon } from 'geojson';

export interface RobotabilityFeature extends Feature {
  geometry: Polygon;
  properties: {
    score_percentile: number;
    centroid: [number, number] | null;
  };
}

export interface RobotabilityBounds {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface RobotabilityConversionResult {
  features: RobotabilityFeature[];
  bounds: RobotabilityBounds | null;
}

export function convertRobotabilityTable(table: Table): RobotabilityConversionResult {
  const geomVector: any = table.getChild('geometry');
  const scoreVector: any = table.getChild('score_percentile');

  if (!geomVector || !scoreVector) {
    throw new Error('Robotability Arrow table missing expected columns.');
  }

  const features: RobotabilityFeature[] = [];

  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (let rowIndex = 0; rowIndex < table.numRows; rowIndex++) {
    const multiPolygon = geomVector.get(rowIndex);
    if (!multiPolygon) continue;

    const score = scoreVector.get(rowIndex) ?? 0;

    for (let polyIndex = 0; polyIndex < multiPolygon.length; polyIndex++) {
      const polygon = multiPolygon.get(polyIndex);
      const rings: number[][][] = [];

      let centroidLngSum = 0;
      let centroidLatSum = 0;
      let centroidCount = 0;

      for (let ringIndex = 0; ringIndex < polygon.length; ringIndex++) {
        const ring = polygon.get(ringIndex);
        const coords: number[][] = [];
        for (let vertexIndex = 0; vertexIndex < ring.length; vertexIndex++) {
          const { x, y } = ring.get(vertexIndex) as { x: number; y: number };
          coords.push([x, y]);

          if (x < minLng) minLng = x;
          if (x > maxLng) maxLng = x;
          if (y < minLat) minLat = y;
          if (y > maxLat) maxLat = y;

          centroidLngSum += x;
          centroidLatSum += y;
          centroidCount += 1;
        }

        if (coords.length > 0) {
          const first = coords[0];
          const last = coords[coords.length - 1];
          if (first[0] !== last[0] || first[1] !== last[1]) {
            coords.push([...first]);
          }
          rings.push(coords);
        }
      }

      if (rings.length === 0) continue;

      const centroid: [number, number] | null = centroidCount > 0
        ? [centroidLngSum / centroidCount, centroidLatSum / centroidCount]
        : null;

    features.push({
      type: 'Feature',
      geometry: {
          type: 'Polygon',
          coordinates: rings,
      },
      properties: {
          score_percentile: score,
          centroid,
      },
    });
  }
  }

  const bounds: RobotabilityBounds | null = Number.isFinite(minLng) && Number.isFinite(maxLng) && Number.isFinite(minLat) && Number.isFinite(maxLat)
    ? { minLng, maxLng, minLat, maxLat }
    : null;

  return {
    features,
    bounds,
  };
}
