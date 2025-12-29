import { useState, useCallback, useRef } from 'react';
import type { WhiteboardItem } from '../types/whiteboard';
import { STICKY_NOTE } from '../constants/whiteboard';
import { calculateOptimalSize, measureContentHeight } from '../utils/contentMeasurement';
import { useNavigate } from 'react-router-dom'; // Import useNavigate from react-router-dom

interface DragState {
  itemId: string | null;
  initialMousePos: { x: number; y: number } | null;
  initialItemPos: { x: number; y: number } | null;
  offset: { x: number; y: number } | null;
}

interface WhiteboardItemsOptions {
  onZoomToFit?: (cardElement: HTMLElement, expanded: boolean) => void;
}

export const useWhiteboardItems = (options: WhiteboardItemsOptions = {}) => {
  const [items, setItems] = useState<WhiteboardItem[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const dragState = useRef<DragState>({
    itemId: null,
    initialMousePos: null,
    initialItemPos: null,
    offset: null
  });

  const navigate = useNavigate(); // Initialize useNavigate

  // Helper: Get current scale from container CSS variable
  const getContainerScale = () => {
    // Change from '.whiteboard-container' to '.transform-container'
    const container = document.querySelector('.transform-container');
    if (!container) return 1;
    const computed = getComputedStyle(container);
    const scale = parseFloat(computed.getPropertyValue('--scale'));
    return isNaN(scale) ? 1 : scale;
  };

  // Update handleDragMove to use transform-container and center-relative coordinates
  const handleDragMove = useCallback((event: MouseEvent) => {
    const { itemId, offset } = dragState.current;
    if (!itemId || !offset) return;
    
    // Get transform container and its dimensions
    const container = document.querySelector('.transform-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const scale = getContainerScale();
    
    // Calculate center of container
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Convert mouse position to coordinates relative to center
    const relativeMouseX = (event.clientX - centerX) / scale;
    const relativeMouseY = (event.clientY - centerY) / scale;
    
    // In world-space x,y: camera target is at (camX, camY)
    // ScreenPos = (WorldPoint - camX) * Scale
    // WorldPoint = ScreenPos / Scale + camX
    
    const containerTransform = document.querySelector('.transform-container');
    const camX = containerTransform ? parseFloat(getComputedStyle(containerTransform).getPropertyValue('--translateX')) : 0;
    const camY = containerTransform ? parseFloat(getComputedStyle(containerTransform).getPropertyValue('--translateY')) : 0;

    // The current camera target in world units is actually -camX, -camY
    const worldTargetX = -camX;
    const worldTargetY = -camY;

    const mouseWorldX = relativeMouseX + worldTargetX;
    const mouseWorldY = relativeMouseY + worldTargetY;

    // Calculate new position accounting for offset in world space
    const newX = mouseWorldX - offset.x;
    const newY = mouseWorldY - offset.y;
    
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            position: {
              ...item.position,
              x: newX,
              y: newY
            }
          };
        }
        return item;
      })
    );
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    dragState.current = {
      itemId: null,
      initialMousePos: null,
      initialItemPos: null,
      offset: null
    };
    
    window.removeEventListener('mousemove', handleDragMove);
    window.removeEventListener('mouseup', handleDragEnd);
  }, [handleDragMove]);

  // Update handleDragStart to also use center-relative coordinates
  const handleDragStart = useCallback((id: string, event: React.MouseEvent<Element>) => {
    event.preventDefault();
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Get transform container and its dimensions
    const container = document.querySelector('.transform-container');
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const scale = getContainerScale();
    
    // Calculate center of container
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Convert mouse position to coordinates relative to center
    const relativeMouseX = (event.clientX - centerX) / scale;
    const relativeMouseY = (event.clientY - centerY) / scale;
    
    const camX = container ? parseFloat(getComputedStyle(container).getPropertyValue('--translateX')) : 0;
    const camY = container ? parseFloat(getComputedStyle(container).getPropertyValue('--translateY')) : 0;
    const worldTargetX = -camX;
    const worldTargetY = -camY;

    const mouseWorldX = relativeMouseX + worldTargetX;
    const mouseWorldY = relativeMouseY + worldTargetY;

    // Calculate offset from item's world position
    const offset = {
      x: mouseWorldX - item.position.x,
      y: mouseWorldY - item.position.y
    };
    
    setDragging(id);
    dragState.current = {
      itemId: id,
      initialMousePos: { x: relativeMouseX, y: relativeMouseY },
      initialItemPos: { x: item.position.x, y: item.position.y },
      offset
    };
    
    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  }, [items, handleDragMove, handleDragEnd]);

  // Content-aware expand function that measures content height
  const handleExpand = useCallback((id: string, cardElement?: HTMLElement | null) => {
    console.log('handleExpand triggered for item:', id);
    
    // Check if we're on mobile
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
      window.innerWidth <= 768
    );
    
    // Get current state from items to determine if we are expanding or collapsing
    const targetItem = items.find(it => it.id === id);
    if (!targetItem) return;
    
    const wasExpanded = targetItem.position.expanded;
    
    // Perform measurement OUTSIDE of setItems
          let newDimensions = {
      width: wasExpanded ? STICKY_NOTE.WIDTH : STICKY_NOTE.WIDTH * 1.5,
      height: wasExpanded ? STICKY_NOTE.HEIGHT : STICKY_NOTE.HEIGHT * 1.5
          };
          
          // Use content-aware sizing if we have access to the card element
          if (cardElement) {
            try {
        newDimensions = calculateOptimalSize(cardElement, wasExpanded);
              console.log('Content-aware sizing:', newDimensions);
            } catch (error) {
              console.warn('Failed to measure content, using fallback sizing:', error);
            }
          }
    
    // Now update state with pre-calculated dimensions
    setItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          console.log('Toggling expand for', id, 'from', wasExpanded, 'to', !wasExpanded);
          
          // If expanding and we have zoom function, auto-zoom to fit (mobile devices)
          if (isMobile && !wasExpanded && options.onZoomToFit && cardElement) {
            // Delay the zoom to allow the card to finish expanding first
            setTimeout(() => {
              options.onZoomToFit!(cardElement, true);
            }, 400); // Delay for the smooth animation
          }
          
          return {
            ...item,
            position: {
              ...item.position,
              width: newDimensions.width,
              height: newDimensions.height,
              expanded: !wasExpanded
            }
          };
        }
        return item;
      })
    );
  }, [items, options]);

  // Resize a card to fit its current content (e.g., after inner image enlargement)
  const handleResizeToContent = useCallback((id: string, cardElement?: HTMLElement | null) => {
    if (!cardElement) return;
    try {
      const measurement = measureContentHeight(cardElement);
      setItems(prevItems => prevItems.map(item => {
        if (item.id !== id) return item;
        return {
          ...item,
          position: {
            ...item.position,
            width: measurement.requiredWidth,
            height: measurement.requiredHeight,
          }
        };
      }));
    } catch (error) {
      console.warn('Failed to resize to content:', error);
    }
  }, []);

  return {
    items,
    setItems,
    dragging,
    handleDragStart,
    handleDragEnd,
    handleExpand,
    handleResizeToContent,
  };
};
