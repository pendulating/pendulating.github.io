import { useState, useCallback, useRef } from 'react';
import type { Transform } from '../types/whiteboard';
import { SCALES } from '../constants/whiteboard';
import { clampScale } from '../utils/whiteboardUtils';

interface Point {
  x: number;
  y: number;
}

export function useWhiteboardGestures(
  onTransformUpdate: (update: Transform | ((prev: Transform) => Transform)) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point>({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);
  const pinchLastDistanceRef = useRef<number>(0);
  const pinchFocalRef = useRef<Point>({ x: 0, y: 0 });

  const handleGestureStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if ('button' in e && e.button !== 0) return;

      if ('touches' in e) {
        if (e.touches.length === 2) {
          // Begin pinch
          const [t1, t2] = [e.touches[0], e.touches[1]];
          const dx = t2.clientX - t1.clientX;
          const dy = t2.clientY - t1.clientY;
          const distance = Math.hypot(dx, dy);
          pinchLastDistanceRef.current = distance;
          pinchFocalRef.current = {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2,
          };
          setIsPinching(true);
          setIsDragging(false);
          e.preventDefault();
          return;
        } else if (e.touches.length === 1) {
          // Start pan
          const currentPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          setIsDragging(true);
          setLastMousePos(currentPos);
          return;
        }
      }

      // Mouse pan start
      const currentPos = { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };
      setIsDragging(true);
      setLastMousePos(currentPos);
    },
    []
  );

  const handleGestureMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      // Handle pinch zoom with two touches
      if ('touches' in e && e.touches.length === 2) {
        e.preventDefault();
        if (!isPinching) return;

        const [t1, t2] = [e.touches[0], e.touches[1]];
        const dx = t2.clientX - t1.clientX;
        const dy = t2.clientY - t1.clientY;
        const distance = Math.hypot(dx, dy);
        const scaleFactor = distance / (pinchLastDistanceRef.current || distance);

        const focal = {
          x: (t1.clientX + t2.clientX) / 2,
          y: (t1.clientY + t2.clientY) / 2,
        };
        pinchFocalRef.current = focal;

        // Apply zoom centered at focal point relative to viewport center
        onTransformUpdate(prev => {
          const newScale = clampScale(prev.scale * scaleFactor, SCALES.MIN, SCALES.MAX);
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const centerX = viewportWidth / 2;
          const centerY = viewportHeight / 2;
          const offsetX = focal.x - centerX;
          const offsetY = focal.y - centerY;
          const sf = newScale / prev.scale;
          const newX = prev.x - (offsetX / prev.scale) * (1 - 1 / sf);
          const newY = prev.y - (offsetY / prev.scale) * (1 - 1 / sf);
          return { x: newX, y: newY, scale: newScale } as Transform;
        });

        pinchLastDistanceRef.current = distance;
        return;
      }

      // One-finger touch or mouse drag panning
      if (!isDragging) return;
      e.preventDefault();

      const currentPos = 'touches' in e
        ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
        : { x: (e as React.MouseEvent).clientX, y: (e as React.MouseEvent).clientY };

      const deltaX = currentPos.x - lastMousePos.x;
      const deltaY = currentPos.y - lastMousePos.y;

      const container = document.querySelector('.transform-container');
      const scale = container ? 
        parseFloat(getComputedStyle(container).getPropertyValue('--scale') || '1') : 
        1;

      onTransformUpdate(prevTransform => ({
        ...prevTransform,
        x: prevTransform.x + deltaX / scale,
        y: prevTransform.y + deltaY / scale
      }));

      setLastMousePos(currentPos);
    },
    [isDragging, isPinching, lastMousePos, onTransformUpdate]
  );

  const handleGestureEnd = useCallback(() => {
    setIsDragging(false);
    setIsPinching(false);
    pinchLastDistanceRef.current = 0;
  }, []);

  return {
    handleGestureStart,
    handleGestureMove,
    handleGestureEnd,
    isDragging
  };
}