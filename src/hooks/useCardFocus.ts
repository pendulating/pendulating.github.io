import { useState, useCallback, useEffect } from 'react';
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

    // Calculate the transform needed to center the camera on the card
    // IMPORTANT: Our container transform applies translate() before scale().
    // That means translations are pre-scale and get scaled by the zoom.
    // To center a world point (x, y), use transform.x = -x, transform.y = -y (no scale factor).
    // Round to avoid sub-pixel issues
    const targetX = Math.round(-cardCenterX * 100) / 100;
    const targetY = Math.round(-cardCenterY * 100) / 100;

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

    // Apply the transform with smooth animation
    updateTransform(newTransform, true);
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