import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import '../../styles/photog.css';

interface CardWrapperProps {
  id: string;
  onDragStart: (id: string, event: React.MouseEvent) => void;
  onDragEnd: () => void;
  onExpand: (id: string, cardElement?: HTMLElement | null) => void;
  children: React.ReactNode;
  item: { position: { x: number; y: number; width: number; height: number; z: number; expanded?: boolean; rotation?: number } };
}

// Animation type definitions
const animationTypes = [
  'flutter-in-wind',
  'flutter-intense',
  'flutter-gentle', 
  'flutter-subtle'
];

// Post-it colors from CSS
const stickyNoteColors = [
  '#fff68f', // Classic Canary Yellow
  '#ff7eb9', // Electric Rose
  '#7afcff', // Electric Blue
  '#ff99c8', // Pale Pink
  '#ffa07a', // Neon Orange
  '#98ff98'  // Mint Green
];

const CardWrapper: React.FC<CardWrapperProps> = ({
  id,
  onDragStart,
  onDragEnd,
  onExpand,
  children,
  item
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Use the actual item's expanded state instead of local state
  const isExpanded = item.position.expanded || false;

  // Generate consistent animation properties based on card ID
  const animationProperties = useMemo(() => {
    // Use the numeric part of the ID (if any) or convert the string to a number
    const idNumber = parseInt(id.replace(/\D/g, '')) || 
                     id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Create deterministic but seemingly random properties
    return {
      animationType: animationTypes[idNumber % animationTypes.length],
      duration: 6 + (idNumber % 7) + Math.floor((idNumber % 100) / 33), // 6-14s
      delay: (idNumber % 20) / 10, // 0-1.9s
      direction: idNumber % 2 === 0 ? 'normal' : 'alternate',
      color: stickyNoteColors[idNumber % stickyNoteColors.length],
      // Always hinge at the top, but vary between left, center, right
      transformOrigin: `top ${idNumber % 3 === 0 ? 'left' : idNumber % 3 === 1 ? 'center' : 'right'}`,
      amplitude: 0.8 + ((idNumber % 10) / 10), // 0.8-1.7
    };
  }, [id]);

  // Set up visibility observation for performance optimization
  useEffect(() => {
    if (!cardRef.current) return;
    
    // Create an observer to detect when card is in viewport
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isInView = entry.isIntersecting && entry.intersectionRatio > 0.1;
        setIsVisible(isInView);
        
        // Pause animations when not visible
        if (isInView) {
          cardRef.current?.classList.remove('paused-animation');
        } else {
          cardRef.current?.classList.add('paused-animation');
        }
      },
      {
        threshold: [0, 0.1, 0.5, 1.0],
        rootMargin: '100px'
      }
    );
    
    // Start observing
    observer.observe(cardRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      e.preventDefault();
      e.stopPropagation();
      setIsInteracting(true); // Set interaction state to true
      onDragStart(id, e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    onDragEnd();
    setIsInteracting(false); // Reset interaction state
  };

  const handleMouseLeave = () => {
    // Don't reset isInteracting here as it might interfere with drag operations
  };

  const handleExpandButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Set transitioning state to true
    setIsTransitioning(true);
    
    // Call the parent's onExpand handler with card element for content measurement
    onExpand(id, cardRef.current);
    
    // Remove transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300); // Match the CSS transition duration (300ms)
  };

  // Add a handler for window mouse up to ensure we reset the state
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isInteracting) {
        setIsInteracting(false);
      }
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isInteracting]);

  // Automatically throttle animations for cards with higher z-indexes
  // Cards closer to the front (higher z) get prioritized with better animations
  const isPrioritized = useMemo(() => {
    return item.position.z >= 10; // Arbitrary threshold - higher z gets priority
  }, [item.position.z]);

  const cardStyle: CSSProperties = {
    '--item-x': `${item.position.x}px`,
    '--item-y': `${item.position.y}px`,
    '--item-z': item.position.z,
    '--item-width': `${item.position.width}px`,
    '--item-height': `${item.position.height}px`,
    '--item-rotation': `${item.position.rotation || 0}deg`,
    touchAction: 'none',
    cursor: 'grab',
    // Add individualized animation properties
    '--flutter-duration': `${animationProperties.duration}s`,
    '--flutter-delay': `${animationProperties.delay}s`,
    '--flutter-amplitude': animationProperties.amplitude,
  } as CSSProperties;

  // Only apply full animation styles when visible and not interacting
  const stickyNoteStyle: CSSProperties = {
    backgroundColor: animationProperties.color,
    transformOrigin: animationProperties.transformOrigin,
    // Remove the grid pattern background
    // Only apply animation styles conditionally for performance
    ...(!isInteracting && isVisible ? {
      animation: `${animationProperties.animationType} var(--flutter-duration) ease-in-out infinite ${animationProperties.delay}s`,
      animationDirection: animationProperties.direction as any,
    } : {
      // When interacting or not visible, use a simplified state
      animation: 'none'
    }),
  };

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className={`draggable-area ${!isVisible ? 'paused-animation' : ''} ${isInteracting ? 'is-interacting' : ''}`}
      data-item-id={id}
    >
      <div 
        className={`
          sticky-note 
          ${isInteracting ? 'is-interacting' : ''} 
          ${isExpanded ? 'is-resized' : ''}
          ${isTransitioning ? 'is-transitioning-size' : ''}
          ${!isPrioritized && !isVisible ? 'simplified-animation' : ''}
          etched-content
        `} 
        style={stickyNoteStyle}
      >
        <div className="sticky-note-content etched-text">
          {children}
        </div>
        
        {/* Auto-resize button - always visible and properly synced */}
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-50">
          <button
            onClick={handleExpandButtonClick}
            className="w-6 h-6 rounded-sm bg-gray-900/70 border border-cyan-500/30 
                       hover:bg-cyan-900/30 transition-all duration-200 flex items-center 
                       justify-center group etched-button"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? (
              <Minimize2 
                size={14} 
                className="text-cyan-500/90 group-hover:text-cyan-400 
                           transform group-hover:scale-110 transition-all duration-200" 
              />
            ) : (
              <Maximize2 
                size={14} 
                className="text-cyan-500/90 group-hover:text-cyan-400 
                           transform group-hover:scale-110 transition-all duration-200" 
              />
            )}
          </button>
        </div>

        {/* Removed the drag-to-resize handle completely */}
      </div>
    </div>
  );
};

export default CardWrapper;