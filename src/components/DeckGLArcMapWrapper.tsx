import { useState, useEffect } from 'react';
import DeckGLArcMap from './DeckGLArcMap';

export default function DeckGLArcMapWrapper() {
  const [params, setParams] = useState<{
    dataUrl: string;
    initialCenter: [number, number];
    initialZoom: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    // Read URL params client-side
    const urlParams = new URLSearchParams(window.location.search);
    
    const dataUrl = urlParams.get('data') || '/data/springs-best-25-map.json';
    const rawZoom = urlParams.get('zoom');
    const rawCenter = urlParams.get('center');
    const rawHeight = urlParams.get('height');
    
    const zoom = rawZoom ? Number(rawZoom) : 1.5;
    const height = rawHeight ? Number(rawHeight) : 400;
    
    const centerParts = (rawCenter || '20,0')
      .split(',')
      .map(v => Number(v.trim()))
      .filter(v => !Number.isNaN(v));
    
    const center: [number, number] = centerParts.length === 2 
      ? [centerParts[0], centerParts[1]] 
      : [20, 0];

    setParams({
      dataUrl,
      initialCenter: center,
      initialZoom: zoom,
      height
    });
  }, []);

  if (!params) {
    return <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />;
  }

  return (
    <DeckGLArcMap
      dataUrl={params.dataUrl}
      initialCenter={params.initialCenter}
      initialZoom={params.initialZoom}
      height={params.height}
    />
  );
}




