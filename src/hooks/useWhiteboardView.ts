import { useState, useCallback, useRef, useEffect } from 'react';
import type { Transform } from '../types/whiteboard';
import { SCALES } from '../constants/whiteboard';
import { clampScale } from '../utils/whiteboardUtils';
import { useIsomorphicLayoutEffect } from './useIsomorphicLayoutEffect';
import { throttle } from '../utils/mobileOptimizations';

// In our coordinate system, (0,0) is the center of the container
function computeInitialTransform(): Transform {
  return { x: 0, y: 0, scale: SCALES.INITIAL };
}

export function useWhiteboardView() {
  const [transform, setTransform] = useState<Transform>(computeInitialTransform());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Check if we're on mobile for throttling
  const isMobile = 
    typeof window !== 'undefined' && 
    (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768);

  const updateTransform = useCallback(
    (transformUpdate: Transform | ((prev: Transform) => Transform), animate = false) => {
      if (animate) {
        setIsTransitioning(true);
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
        }, 1300); // Long enough to handle smooth card navigation (1200ms) + buffer
      }
      
      setTransform(prevTransform => {
        const newTransform = typeof transformUpdate === 'function'
          ? (transformUpdate as (prev: Transform) => Transform)(prevTransform)
          : transformUpdate;
          
        // Simplified bounds checking based on viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Allow very generous panning so focus/centering on distant items isn't clamped
        // This prevents misalignment when filtering changes the focused card
        const maxPanX = viewportWidth * 100; // previously * 2
        const maxPanY = viewportHeight * 100; // previously * 2
        
        return {
          x: Math.max(-maxPanX, Math.min(maxPanX, newTransform.x)),
          y: Math.max(-maxPanY, Math.min(maxPanY, newTransform.y)),
          scale: clampScale(newTransform.scale, SCALES.MIN, SCALES.MAX)
        };
      });
    },
    []
  );

  // Mobile-optimized version
  const throttledUpdateTransform = useCallback(
    throttle((update: Transform | ((prev: Transform) => Transform), animate = false) => {
      updateTransform(update, animate);
    }, 16), // ~60fps
    [updateTransform]
  );

  // Use the appropriate update function based on device
  const effectiveUpdateTransform = isMobile ? throttledUpdateTransform : updateTransform;

  const handleZoom = useCallback((newScale: number, focalX: number, focalY: number, animate = false) => {
    // Get the viewport center
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    
    // Calculate focal point offset from viewport center
    const offsetX = focalX - centerX;
    const offsetY = focalY - centerY;
    
    // Scale factor determines how much to adjust pan
    const scaleFactor = newScale / transform.scale;
    
    // Adjust position to keep focal point steady during zoom
    // The formula needs to account for the center-based coordinate system
    const newX = transform.x - (offsetX / transform.scale) * (1 - 1/scaleFactor);
    const newY = transform.y - (offsetY / transform.scale) * (1 - 1/scaleFactor);
    
    effectiveUpdateTransform({ x: newX, y: newY, scale: newScale }, animate);
  }, [transform, effectiveUpdateTransform]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY;
      const zoomFactor = 0.005;
      const direction = delta > 0 ? 1 : -1;
      const newScale = clampScale(
        transform.scale * (1 + direction * zoomFactor * Math.abs(delta) / 10),
        SCALES.MIN,
        SCALES.MAX
      );
      
      // Zoom toward the mouse position
      handleZoom(newScale, e.clientX, e.clientY, false);
    } else {
      // Pan with mouse wheel (without Ctrl key)
      const panSpeed = 2.5 / transform.scale; // Adjust pan speed based on zoom level
      
      // Apply pan in the correct direction, accounting for centered coordinates
      const newX = transform.x - e.deltaX * panSpeed;
      const newY = transform.y - e.deltaY * panSpeed;
      
      effectiveUpdateTransform((prev: Transform) => ({
        ...prev,
        x: newX,
        y: newY
      }));
    }
  }, [transform, handleZoom, effectiveUpdateTransform]);

  const handleZoomIn = useCallback((animate = false) => {
    const newScale = clampScale(transform.scale * 1.2, SCALES.MIN, SCALES.MAX);
    // Zoom toward the center of the viewport
    handleZoom(newScale, window.innerWidth / 2, window.innerHeight / 2, animate);
  }, [transform.scale, handleZoom]);

  const handleZoomOut = useCallback((animate = false) => {
    const newScale = clampScale(transform.scale / 1.2, SCALES.MIN, SCALES.MAX);
    // Zoom out from the center of the viewport
    handleZoom(newScale, window.innerWidth / 2, window.innerHeight / 2, animate);
  }, [transform.scale, handleZoom]);

  const centerView = useCallback((animate = true) => {
    // Reset to the initial transform
    effectiveUpdateTransform(computeInitialTransform(), animate);
  }, [effectiveUpdateTransform]);

  useIsomorphicLayoutEffect(() => {
    // Center the view on initial load
    centerView(false);
    
    // Handle window resize to maintain centered view
    const handleResize = () => {
      effectiveUpdateTransform((prev: Transform) => ({
        ...prev,
        x: 0,
        y: 0
      }), false);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [centerView, effectiveUpdateTransform]);

  return {
    transform,
    isTransitioning,
    updateTransform: effectiveUpdateTransform,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    centerView
  };
}