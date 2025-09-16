import React from 'react';
import type { Transform } from '../../types/whiteboard';
import '../../styles/whiteboard.css';

interface WhiteboardContainerProps {
  transform: Transform;
  isTransitioning: boolean;
  width: number;
  height: number;
  children: React.ReactNode;
}

export function WhiteboardContainer({
  transform,
  isTransitioning,
  width,
  height,
  children
}: WhiteboardContainerProps) {
  return (
    <div
      className={`whiteboard-container ${isTransitioning ? 'is-transitioning' : ''}`}
      style={{
        /* Set CSS variables for dynamic transform values */
        "--translateX": `${transform.x}px`,
        "--translateY": `${transform.y}px`,
        "--scale": transform.scale,
      } as React.CSSProperties}
      data-debug-transform={`${transform.x},${transform.y},${transform.scale}`}
    >
      {children}
    </div>
  );
}