import React, { useRef, useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import '../../styles/photog.css';
import postitSchemes from '../../assets/postit-schemes.json';

interface CardWrapperProps {
  id: string;
  onDragStart: (id: string, event: React.MouseEvent) => void;
  onDragEnd: () => void;
  onExpand: (id: string, cardElement?: HTMLElement | null) => void;
  children: React.ReactNode;
  item: { position: { x: number; y: number; width: number; height: number; z: number; expanded?: boolean; rotation?: number } };
  isFocused?: boolean;
}

// Animation type definitions
const animationTypes = [
  'flutter-in-wind',
  'flutter-intense',
  'flutter-gentle', 
  'flutter-subtle'
];

// Select scheme (current: Marseilles; fallback to default then hardcoded)
const stickyNoteColors: string[] = (postitSchemes as any)?.Marseilles
  ?? (postitSchemes as any)?.default
  ?? [
  '#fff68f', '#ff7eb9', '#7afcff', '#ff99c8', '#ffa07a', '#98ff98'
];

const CardWrapper: React.FC<CardWrapperProps> = ({
  id,
  onDragStart,
  onDragEnd,
  onExpand,
  children,
  item,
  isFocused = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Use the actual item's expanded state instead of local state
  const isExpanded = item.position.expanded || false;

  // Generate consistent animation properties based on card ID (seeded hash for better spread)
  const animationProperties = useMemo(() => {
    const djb2 = (str: string) => {
      let h = 5381;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) + str.charCodeAt(i);
      }
      return h >>> 0; // unsigned
    };
    const seed = djb2(id);
    const pick = (mod: number) => seed % mod;
    
    return {
      animationType: animationTypes[pick(animationTypes.length)],
      duration: 6 + (seed % 7) + Math.floor((seed % 100) / 33), // 6-14s
      delay: (seed % 20) / 10, // 0-1.9s
      direction: seed % 2 === 0 ? 'normal' : 'alternate',
      color: stickyNoteColors[pick(stickyNoteColors.length)],
      transformOrigin: `top ${seed % 3 === 0 ? 'left' : seed % 3 === 1 ? 'center' : 'right'}`,
      amplitude: 0.8 + ((seed % 10) / 10), // 0.8-1.7
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
    // Only apply animation styles conditionally for performance
    ...(!isInteracting && isVisible ? {
      // Use individual properties instead of shorthand to avoid React warnings
      animationName: 'none',
    } : {
      // When interacting or not visible, use a simplified state
      animationName: 'none'
    }),
  };

  // Start animation as soon as the card is visible (even during transitions)
  if (isVisible && !isInteracting) {
    // Focused cards sway; non-focused flutter. Avoid mixing shorthand/non-shorthand warnings.
    const animName = isFocused ? 'var(--focused-wind-animation-name, focused-wind-sway)' : animationProperties.animationType;
    (stickyNoteStyle as any).animationName = animName;
    (stickyNoteStyle as any).animationDuration = isFocused ? '6s' : `var(--flutter-duration)`;
    (stickyNoteStyle as any).animationTimingFunction = 'ease-in-out';
    (stickyNoteStyle as any).animationIterationCount = 'infinite';
    (stickyNoteStyle as any).animationDelay = isFocused ? '0s' : `${animationProperties.delay}s`;
    (stickyNoteStyle as any).animationDirection = animationProperties.direction;
  }

  return (
    <div
      ref={cardRef}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      style={cardStyle}
      className={`draggable-area ${!isVisible ? 'paused-animation' : ''} ${isInteracting ? 'is-interacting' : ''} ${isFocused ? 'is-focused' : ''}`}
      data-item-id={id}
    >
      <div 
        className={`
          sticky-note 
          ${isInteracting ? 'is-interacting' : ''} 
          ${isExpanded ? 'is-resized' : ''}
          ${isTransitioning ? 'is-transitioning-size' : ''}
          ${!isPrioritized && !isVisible ? 'simplified-animation' : ''}
          etched-content ${isFocused ? 'focused-card' : ''}
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