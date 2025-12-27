import { useState, useCallback, useEffect, useRef } from 'react';
import type { WhiteboardItem, Transform } from '../types/whiteboard';

interface UseCardFocusResult {
  currentIndex: number;
  onFocusPrev: () => void;
  onFocusNext: () => void;
  focusOnCard: (index: number) => void;
}

export function useCardFocus(
  items: WhiteboardItem[],
  currentTransform: Transform,
  updateTransform: (transform: Transform, animate?: boolean) => void
): UseCardFocusResult {
  const [currentIndex, setCurrentIndex] = useState(0);
  const correctionTimerRef = useRef<number | undefined>(undefined);
  
  // Use different zoom levels for mobile vs desktop
  const getZoomLevel = () => {
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      window.innerWidth <= 768
    );
    return isMobile ? 1.2 : 1.5; // Slightly less zoom on mobile for better viewport usage
  };

  const focusOnCard = useCallback((index: number) => {
    console.log('focusOnCard called with index:', index, 'items.length:', items.length);
    
    if (items.length === 0) {
      console.log('focusOnCard aborted - no items');
      return;
    }
    
    const clampedIndex = ((index % items.length) + items.length) % items.length;
    const card = items[clampedIndex];
    
    console.log('focusOnCard processing:', {
      originalIndex: index,
      clampedIndex,
      cardId: card.id,
      cardPosition: card.position
    });

    setCurrentIndex(clampedIndex);

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if we're on mobile
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      viewportWidth <= 768
    );

    // Card position from the layout - this IS the center point already
    // The layout calculation in itemLayoutUtils.ts positions cards at their visual centers
    // The CSS translate(-50%, -50%) centers the card div on these coordinates
    const cardCenterX = card.position.x;
    const cardCenterY = card.position.y;

    // Use appropriate zoom level
    const zoomLevel = getZoomLevel();

    // To align the card centroid with the viewport center under
    // container transform: translate(-50%,-50%) translate(tx,ty) scale(s)
    // (rightmost applied first), we need tx = -s * cx, ty = -s * cy
    const targetX = Math.round((-cardCenterX * getZoomLevel()) * 100) / 100;
    const targetY = Math.round((-cardCenterY * getZoomLevel()) * 100) / 100;

    console.log('Card focus debug:', {
      cardIndex: clampedIndex,
      cardId: card.id,
      cardPosition: { x: cardCenterX, y: cardCenterY },
      cardDimensions: { width: card.position.width, height: card.position.height },
      targetTransform: { x: targetX, y: targetY, scale: zoomLevel },
      currentTransform: currentTransform,
      viewport: { width: viewportWidth, height: viewportHeight },
      isMobile
    });

    const newTransform: Transform = { x: targetX, y: targetY, scale: zoomLevel };

    // Calculate current world center
    const currentWorldX = -currentTransform.x / currentTransform.scale;
    const currentWorldY = -currentTransform.y / currentTransform.scale;

    // Calculate distance between current and target
    const dx = cardCenterX - currentWorldX;
    const dy = cardCenterY - currentWorldY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Get the container to set dynamic transition properties
    const container = document.querySelector('.transform-container') as HTMLElement;

    // Only do "fly-to" if distance is significant
    if (distance > 500) {
      // Fluid "Fly-to" implementation using split transform transitions
      // Translation is a single continuous smooth path
      // Scale "hops" to a peak and dives back in
      
      const peakScale = Math.max(0.35, Math.min(currentTransform.scale, zoomLevel) * 0.65);
      
      if (container) {
        // Continuous translation over 1.2s
        container.style.setProperty('--translate-duration', '1.2s');
        container.style.setProperty('--translate-timing', 'cubic-bezier(0.45, 0, 0.55, 1)');
        
        // Scale stage 1: takeoff to peak
        container.style.setProperty('--scale-duration', '0.6s');
        container.style.setProperty('--scale-timing', 'cubic-bezier(0.4, 0, 0.6, 1)');
      }

      // Start the translation immediately to final destination
      // And start scale to peak
      updateTransform({ ...newTransform, scale: peakScale }, true);

      // Stage 2: scale "dive" to target
      setTimeout(() => {
        if (container) {
          container.style.setProperty('--scale-duration', '0.6s');
          container.style.setProperty('--scale-timing', 'cubic-bezier(0.4, 0, 0.6, 1)');
        }
        updateTransform(newTransform, true);
      }, 600);
    } else {
      // Standard linear focus for short distances
      if (container) {
        container.style.setProperty('--translate-duration', '0.8s');
        container.style.setProperty('--translate-timing', 'cubic-bezier(0.25, 0.8, 0.25, 1)');
        container.style.setProperty('--scale-duration', '0.8s');
        container.style.setProperty('--scale-timing', 'cubic-bezier(0.25, 0.8, 0.25, 1)');
      }
      updateTransform(newTransform, true);
    }

    // After the transition completes, measure and apply one-shot correction
    if (correctionTimerRef.current) {
      window.clearTimeout(correctionTimerRef.current);
    }
    correctionTimerRef.current = window.setTimeout(() => {
      const el = document.querySelector(`[data-item-id="${card.id}"]`) as HTMLElement | null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const vx = window.innerWidth / 2;
      const vy = window.innerHeight / 2;
      const dx = cx - vx;
      const dy = cy - vy;
      if (typeof console !== 'undefined') {
        console.log('[Focus Debug] world', { cx: cardCenterX, cy: cardCenterY }, 'transform', newTransform, 'screen', { cx, cy }, 'delta', { dx, dy });
      }
      // Adjust translation directly in screen space
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        updateTransform({ x: newTransform.x - dx, y: newTransform.y - dy, scale: newTransform.scale }, false);
      }
    }, 1650); // slightly longer than fly-to combined transition (~1.4s)
  }, [items, updateTransform, currentTransform]);

  const onFocusPrev = useCallback(() => {
    console.log('onFocusPrev called - currentIndex:', currentIndex, 'will focus on:', currentIndex - 1);
    focusOnCard(currentIndex - 1);
  }, [currentIndex, focusOnCard]);

  const onFocusNext = useCallback(() => {
    console.log('onFocusNext called - currentIndex:', currentIndex, 'will focus on:', currentIndex + 1);
    focusOnCard(currentIndex + 1);
  }, [currentIndex, focusOnCard]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        onFocusPrev();
      } else if (e.key === 'ArrowRight') {
        onFocusNext(); 
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onFocusPrev, onFocusNext]);

  return { currentIndex, onFocusPrev, onFocusNext, focusOnCard };
}