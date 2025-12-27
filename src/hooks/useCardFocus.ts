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
    const isPortrait = viewportHeight > viewportWidth;

    // Card position from the layout - this IS the center point already
    // The layout calculation in itemLayoutUtils.ts positions cards at their visual centers
    // The CSS translate(-50%, -50%) centers the card div on these coordinates
    const cardCenterX = card.position.x;
    const cardCenterY = card.position.y;

    // Use appropriate zoom level
    const zoomLevel = getZoomLevel();

    const targetX = -cardCenterX;
    const targetY = -cardCenterY;

    console.log('Card focus debug:', {
      cardIndex: clampedIndex,
      cardId: card.id,
      cardPosition: { x: cardCenterX, y: cardCenterY },
      cardDimensions: { width: card.position.width, height: card.position.height },
      targetTransform: { x: targetX, y: targetY, scale: zoomLevel },
      currentTransform: currentTransform,
      viewport: { width: viewportWidth, height: viewportHeight },
      isMobile,
      isPortrait
    });

    const newTransform: Transform = { x: targetX, y: targetY, scale: zoomLevel };

    // Continuous world-space path calculation
    const dx = targetX - currentTransform.x;
    const dy = targetY - currentTransform.y;
    
    // On portrait mobile, horizontal distance is more "expensive" visually
    const visualDx = isPortrait ? dx * (viewportHeight / viewportWidth) : dx;
    const distance = Math.sqrt(visualDx * visualDx + dy * dy);

    // Get the container to set dynamic transition properties
    const container = document.querySelector('.transform-container') as HTMLElement;

    // Only do "fly-to" if distance is significant
    // Adjusted threshold for mobile/portrait to trigger more appropriately
    const flyToThreshold = isMobile ? 300 : 500;

    if (distance > flyToThreshold) {
      // Fluid "Fly-to" implementation using split transform transitions
      // Translation is now pure WORLD space and completely independent of scale
      
      const peakScaleMultiplier = isPortrait ? 0.5 : 0.65;
      const peakScale = Math.max(0.35, Math.min(currentTransform.scale, zoomLevel) * peakScaleMultiplier);
      
      if (container) {
        // Continuous world translation - pure straight line
        const duration = isMobile ? '1.4s' : '1.2s';
        container.style.setProperty('--translate-duration', duration);
        container.style.setProperty('--translate-timing', 'cubic-bezier(0.45, 0, 0.55, 1)');
        
        // Scale stage 1: takeoff to peak
        const scaleStageDuration = isMobile ? '0.7s' : '0.6s';
        container.style.setProperty('--scale-duration', scaleStageDuration);
        container.style.setProperty('--scale-timing', 'cubic-bezier(0.4, 0, 0.6, 1)');
      }

      // Start world translation immediately to final destination
      // Scale hops while translation happens in a straight line
      updateTransform({ ...newTransform, scale: peakScale }, true);

      // Stage 2: scale "dive" to target
      setTimeout(() => {
        if (container) {
          const scaleStageDuration = isMobile ? '0.7s' : '0.6s';
          container.style.setProperty('--scale-duration', scaleStageDuration);
          container.style.setProperty('--scale-timing', 'cubic-bezier(0.4, 0, 0.6, 1)');
        }
        updateTransform(newTransform, true);
      }, isMobile ? 700 : 600);
    } else {
      // Standard linear focus for short distances
      if (container) {
        const duration = isMobile ? '1s' : '0.8s';
        container.style.setProperty('--translate-duration', duration);
        container.style.setProperty('--translate-timing', 'cubic-bezier(0.25, 0.8, 0.25, 1)');
        container.style.setProperty('--scale-duration', duration);
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
      const sdx = cx - vx;
      const sdy = cy - vy;
      if (typeof console !== 'undefined') {
        console.log('[Focus Debug] world', { cx: cardCenterX, cy: cardCenterY }, 'transform', newTransform, 'screen', { cx, cy }, 'delta', { sdx, sdy });
      }
      // Adjust translation directly in world space
      if (Math.abs(sdx) > 0.5 || Math.abs(sdy) > 0.5) {
        updateTransform({ x: newTransform.x - sdx / zoomLevel, y: newTransform.y - sdy / zoomLevel, scale: newTransform.scale }, false);
      }
    }, isMobile ? 1850 : 1650); // slightly longer than fly-to combined transition
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