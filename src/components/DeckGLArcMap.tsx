import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { MapboxOverlay } from '@deck.gl/mapbox';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Location {
  id: string;
  lat: number;
  lng: number;
  cluster?: string;
  clusterTitle?: string;
  clusterColor?: string;
  clusterLat?: number;
  clusterLng?: number;
  label?: string;
}

interface MarkerData {
  id: string;
  title?: string;
  subtitle?: string;
  lat?: number;
  lng?: number;
  cluster?: string;
  clusterTitle?: string;
  clusterColor?: string;
  clusterLat?: number;
  clusterLng?: number;
  appleAlbumId?: number;
  link?: string;
  locations?: Location[];
}

interface RouteData {
  id: string;
  stops: string[];
  color: string;
  weight?: number;
  opacity?: number;
}

interface MapData {
  markers: MarkerData[];
  routes: RouteData[];
}

interface PlaceNode {
  id: string;
  name: string;
  coordinates: [number, number];
  color: [number, number, number, number];
  albums: MarkerData[];
}

interface ArcData {
  id: string;
  source: [number, number];
  target: [number, number];
  sourceColor: [number, number, number, number];
  targetColor: [number, number, number, number];
}

function parseRgba(colorStr: string): [number, number, number, number] {
  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) {
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      parseInt(match[3]),
      Math.round((parseFloat(match[4] ?? '1') * 255))
    ];
  }
  if (colorStr.startsWith('#')) {
    const hex = colorStr.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return [r, g, b, 220];
  }
  return [100, 150, 255, 220];
}

function hexToRgba(hex: string): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return [r, g, b, 220];
}

interface Props {
  dataUrl: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  height?: number;
}

export default function DeckGLArcMap({ 
  dataUrl, 
  initialCenter = [20, 0], 
  initialZoom = 1.5,
  height = 400 
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const overlayRef = useRef<MapboxOverlay | null>(null);
  const [data, setData] = useState<MapData | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  // Store initial values in refs to ensure they're captured correctly
  const initialCenterRef = useRef(initialCenter);
  const initialZoomRef = useRef(initialZoom);

  // Fetch data
  useEffect(() => {
    fetch(dataUrl)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [dataUrl]);

  // Process data
  const { places, arcs } = useMemo(() => {
    if (!data) return { places: [], arcs: [] };

    const placeMap = new Map<string, PlaceNode>();

    for (const marker of data.markers) {
      const locations = marker.locations ?? [];
      
      if (locations.length > 0) {
        for (const loc of locations) {
          const clusterId = loc.cluster || loc.id;
          if (!placeMap.has(clusterId)) {
            placeMap.set(clusterId, {
              id: clusterId,
              name: loc.clusterTitle || loc.cluster || loc.label || clusterId,
              coordinates: [loc.lng, loc.lat],
              color: parseRgba(loc.clusterColor || 'rgba(100, 150, 255, 0.8)'),
              albums: []
            });
          }
          placeMap.get(clusterId)!.albums.push(marker);
        }
      } else if (marker.lat !== undefined && marker.lng !== undefined) {
        const clusterId = marker.cluster || marker.id;
        if (!placeMap.has(clusterId)) {
          placeMap.set(clusterId, {
            id: clusterId,
            name: marker.clusterTitle || marker.cluster || marker.title || clusterId,
            coordinates: [marker.lng, marker.lat],
            color: parseRgba(marker.clusterColor || 'rgba(100, 150, 255, 0.8)'),
            albums: []
          });
        }
        placeMap.get(clusterId)!.albums.push(marker);
      }
    }

    const places = Array.from(placeMap.values());

    const arcs: ArcData[] = [];
    for (const route of data.routes) {
      const stops = route.stops;
      const routeColor = hexToRgba(route.color);
      
      for (let i = 0; i < stops.length - 1; i++) {
        const sourcePlace = placeMap.get(stops[i]);
        const targetPlace = placeMap.get(stops[i + 1]);
        
        if (sourcePlace && targetPlace) {
          arcs.push({
            id: `${route.id}-${i}`,
            source: sourcePlace.coordinates,
            target: targetPlace.coordinates,
            sourceColor: routeColor,
            targetColor: routeColor
          });
        }
      }
    }

    return { places, arcs };
  }, [data]);

  // Create layers
  const layers = useMemo(() => {
    if (!data) return [];
    
    return [
      new ArcLayer<ArcData>({
        id: 'arc-layer',
        data: arcs,
        getSourcePosition: d => d.source,
        getTargetPosition: d => d.target,
        getSourceColor: d => d.sourceColor,
        getTargetColor: d => d.targetColor,
        getWidth: 2.5,
        greatCircle: true,
        widthMinPixels: 2,
        widthMaxPixels: 6,
      }),
      new ScatterplotLayer<PlaceNode>({
        id: 'places-layer',
        data: places,
        getPosition: d => d.coordinates,
        getFillColor: d => d.color,
        getRadius: d => 20000 + d.albums.length * 8000,
        radiusMinPixels: 6,
        radiusMaxPixels: 20,
        stroked: true,
        getLineColor: [255, 255, 255, 180],
        lineWidthMinPixels: 1.5,
      }),
    ];
  }, [data, arcs, places]);

  // Update overlay when layers change and map is ready
  useEffect(() => {
    if (overlayRef.current && mapRef.current && mapReady && layers.length > 0) {
      overlayRef.current.setProps({ layers });
      // Trigger a repaint to ensure layers are rendered
      mapRef.current.triggerRepaint();
    }
  }, [layers, mapReady]);

  // Initialize map - only once on mount
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = initialCenterRef.current;
    const zoom = initialZoomRef.current;
    
    // maplibre expects [lng, lat], but we receive [lat, lng]
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [center[1], center[0]],
      zoom: zoom,
      attributionControl: false
    });

    const overlay = new MapboxOverlay({
      layers: []
    });

    map.addControl(overlay as unknown as maplibregl.IControl);
    
    mapRef.current = map;
    overlayRef.current = overlay;

    // Mark map as ready once it's loaded
    map.on('load', () => {
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  return (
    <div style={{ width: '100%', height: `${height}px`, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }} 
      />
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        fontSize: 10,
        color: 'rgba(148, 163, 184, 0.6)',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        © CARTO © OpenStreetMap
      </div>
    </div>
  );
}
