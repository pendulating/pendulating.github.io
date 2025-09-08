import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import type { WhiteboardProps, WhiteboardItem, PhotoData, Transform } from '../types/whiteboard';
import { WhiteboardContainer } from './whiteboard/WhiteboardContainer';
import { WhiteboardContent } from './whiteboard/WhiteboardContent';
import { WhiteboardToolbar } from './whiteboard/WhiteboardToolbar';
import { WhiteboardGrid } from './whiteboard/WhiteboardGrid';
import { useWhiteboardItems } from '../hooks/useWhiteboardItems';
import { useWhiteboardView } from '../hooks/useWhiteboardView';
import { useWhiteboardGestures } from '../hooks/useWhiteboardGestures';
import { useCardFocus } from '../hooks/useCardFocus';
import { STICKY_NOTE, SCALES } from '../constants/whiteboard';
import { calculateInitialLayout, calculateClusteredLayout } from '../utils/itemLayoutUtils';
import { loadPositions, savePositions } from '../utils/whiteboardStorage';
import ErrorBoundary from './ErrorBoundary';
import TagFilterPanel from './TagFilterPanel';

// Debug flag to control logging
const DEBUG = false;

export default function WhiteboardLayout({
  albums,
  photosByAlbum,
  playlists,
  snips,
}: WhiteboardProps) {
  // Simplified performance monitoring
  useEffect(() => {
    if (DEBUG) {
      console.log('[Mount] Data sizes:', {
        albums: albums.length,
        photos: Object.values(photosByAlbum).flat().length,
        playlists: playlists.length,
        snips: snips.length
      });
    }
  }, []);

  // Track if we've already done the initial auto-focus
  const hasAutoFocusedRef = useRef(false);

  const {
    transform,
    isTransitioning,
    updateTransform,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    centerView,
  } = useWhiteboardView();

  // Create zoom-to-fit function for mobile card expansion
  const handleZoomToFit = useCallback((cardElement: HTMLElement, expanded: boolean) => {
    if (!expanded) return; // Only zoom when expanding
    
    // Get the draggable-area element that contains the card position info
    const draggableArea = cardElement.closest('.draggable-area') as HTMLElement;
    if (!draggableArea) return;
    
    // Read the card's position from CSS variables set by CardWrapper
    const computedStyle = getComputedStyle(draggableArea);
    const cardX = parseFloat(computedStyle.getPropertyValue('--item-x')) || 0;
    const cardY = parseFloat(computedStyle.getPropertyValue('--item-y')) || 0;
    
    // Get the card's dimensions after expansion
    const cardRect = cardElement.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Calculate what scale would fit the card with padding
    const padding = 60; // More padding for better mobile viewing
    const requiredWidth = cardRect.width + padding * 2;
    const requiredHeight = cardRect.height + padding * 2;
    
    const scaleX = viewportWidth / requiredWidth;
    const scaleY = viewportHeight / requiredHeight;
    
    // Use the smaller scale to ensure the card fits in both dimensions
    const targetScale = Math.min(scaleX, scaleY, transform.scale);
    
    // Only proceed if we need to zoom out
    if (targetScale < transform.scale) {
      // Calculate transform to center the card at the new scale
      // In whiteboard coordinates, to center a card at position (cardX, cardY),
      // we need transform: x = -cardX * scale, y = -cardY * scale
      const newTransform: Transform = {
        x: -cardX * targetScale,
        y: -cardY * targetScale,
        scale: targetScale
      };
      
      console.log('Auto-zooming and centering expanded card:', {
        cardPosition: { x: cardX, y: cardY },
        currentTransform: transform,
        targetScale,
        newTransform,
        cardSize: { width: cardRect.width, height: cardRect.height }
      });
      
      // Apply the centered zoom transform
      updateTransform(newTransform, true);
    }
  }, [transform, updateTransform]);

  const {
    items,
    setItems,
    dragging,

    handleDragStart,
    handleDragEnd,

    handleExpand,
    handleLongPress,
  } = useWhiteboardItems({
    onZoomToFit: handleZoomToFit
  });

  // Use the focus hook on all items (no filtering)
  const { currentIndex, onFocusPrev, onFocusNext, focusOnCard } = useCardFocus(items, transform, updateTransform);
  const focusedCardId = items.length ? items[currentIndex].id : undefined;

  // Cluster toggle state
  const [clustered, setClustered] = useState(false);

  // Track recent manual interactions to guard auto-focus
  const lastManualInteractionRef = useRef<number>(0);
  const markManualInteraction = useCallback(() => {
    lastManualInteractionRef.current = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }, []);

  // Tag filtering state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [matchAll, setMatchAll] = useState(false);

  // Compute all unique tags from items' data
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    items.forEach(it => {
      const data: any = it.data as any;
      const tags: string[] | undefined = data?.data?.tags;
      if (Array.isArray(tags)) {
        tags.forEach(t => t && tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Relayout visible items with smooth transform transition
  const laidOutItems = useMemo(() => {
    // When no filters, return items as-is
    if (selectedTags.size === 0) return items;

    const selected = selectedTags;
    // Determine which items match
    const isMatch = (it: any) => {
      const tags: string[] = Array.isArray(it?.data?.data?.tags) ? it.data.data.tags : [];
      return matchAll
        ? Array.from(selected).every(t => tags.includes(t))
        : Array.from(selected).some(t => tags.includes(t));
    };

    const matching = items.filter(isMatch);
    const layoutFn = clustered ? calculateClusteredLayout : calculateInitialLayout;
    const relayout = layoutFn(matching);

    // Map new x/y onto matching items; move non-matching offscreen
    const relayoutMap = new Map<string, { x: number; y: number; z: number }>();
    relayout.forEach(it => relayoutMap.set(it.id, { x: it.position.x, y: it.position.y, z: it.position.z }));

    return items.map(it => {
      if (relayoutMap.has(it.id)) {
        const pos = relayoutMap.get(it.id)!;
        return {
          ...it,
          position: {
            ...it.position,
            x: pos.x,
            y: pos.y,
            z: pos.z
          }
        };
      }
      // hide non-matching offscreen
      return {
        ...it,
        position: { ...it.position, x: it.position.x + 10000, y: it.position.y + 10000 }
      };
    });
  }, [items, selectedTags, matchAll, clustered]);

  // Helper: focus by DOM-derived position (works with laidOutItems)
  const focusItemByIdDOM = useCallback((id: string) => {
    const el = document.querySelector(`.draggable-area[data-item-id="${id}"]`) as HTMLElement | null;
    if (!el) return;
    const styles = getComputedStyle(el);
    const x = parseFloat(styles.getPropertyValue('--item-x')) || 0;
    const y = parseFloat(styles.getPropertyValue('--item-y')) || 0;
    const zoomLevel = 1.2; // mobile-friendly zoom
    updateTransform({ x: Math.round(-x * zoomLevel * 100) / 100, y: Math.round(-y * zoomLevel * 100) / 100, scale: zoomLevel }, true);
  }, [updateTransform]);

  // Check if we're on mobile
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768
  );

  // Mobile autofocus adaptation on tag toggle
  useEffect(() => {
    if (!isMobile) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastManualInteractionRef.current < 500) return;
    const selected = selectedTags;
    const matches = (it: any) => {
      const tags: string[] = Array.isArray(it?.data?.data?.tags) ? it.data.data.tags : [];
      return selected.size === 0 ? true : (matchAll
        ? Array.from(selected).every(t => tags.includes(t))
        : Array.from(selected).some(t => tags.includes(t)));
    };
    const visibleIds = items.filter(matches).map(it => it.id);
    if (visibleIds.length === 0) return;
    if (!focusedCardId || !visibleIds.includes(focusedCardId)) {
      // Focus first visible after layout effect tick
      requestAnimationFrame(() => {
        const el = document.querySelector(`.draggable-area[data-item-id="${visibleIds[0]}"]`) as HTMLElement | null;
        if (!el) return;
        const styles = getComputedStyle(el);
        const x = parseFloat(styles.getPropertyValue('--item-x')) || 0;
        const y = parseFloat(styles.getPropertyValue('--item-y')) || 0;
        const zoomLevel = 1.2;
        updateTransform({ x: Math.round(-x * zoomLevel * 100) / 100, y: Math.round(-y * zoomLevel * 100) / 100, scale: zoomLevel }, true);
      });
    }
  }, [selectedTags, matchAll, items, isMobile, focusedCardId, updateTransform]);

  // Deep-link support (album/snip/playlist/:slug)
  const params = useParams();
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  const routeType = (pathParts[0] === 'album' || pathParts[0] === 'snip' || pathParts[0] === 'playlist')
    ? (pathParts[0] as 'album' | 'snip' | 'playlist')
    : undefined;
  const routeSlug = (params as any)?.slug as string | undefined;
  const hasDeepLink = Boolean(routeType && routeSlug);

  const {
    handleGestureStart,
    handleGestureMove,
    handleGestureEnd,
    isDragging: isPanning,
  } = useWhiteboardGestures(updateTransform);

  // Wrap gesture start to mark manual interaction
  const onGestureStart = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    markManualInteraction();
    handleGestureStart(e);
  }, [handleGestureStart, markManualInteraction]);

  // Wrap toolbar and focus controls to record manual interaction
  const onZoomInMarked = useCallback((animate?: boolean) => { markManualInteraction(); handleZoomIn(animate); }, [handleZoomIn, markManualInteraction]);
  const onZoomOutMarked = useCallback((animate?: boolean) => { markManualInteraction(); handleZoomOut(animate); }, [handleZoomOut, markManualInteraction]);
  const onCenterMarked = useCallback(() => { markManualInteraction(); centerView(); }, [centerView, markManualInteraction]);
  const onFocusPrevMarked = useCallback(() => { markManualInteraction(); onFocusPrev(); }, [onFocusPrev, markManualInteraction]);
  const onFocusNextMarked = useCallback(() => { markManualInteraction(); onFocusNext(); }, [onFocusNext, markManualInteraction]);

  // Simplified item initialization
  const initializeItems = useCallback(() => {
    const initialItems: WhiteboardItem[] = [
      ...albums.map(album => ({
        id: `album-${album.slug}`,
        type: 'album' as const,
        data: album,
        position: { 
          x: 0, 
          y: 0, 
          z: 0, 
          width: STICKY_NOTE.WIDTH, 
          height: STICKY_NOTE.HEIGHT, 
          expanded: false 
        },
      })),
      ...snips.map(snip => ({
        id: `snip-${snip.slug}`,
        type: 'snip' as const,
        data: snip,
        position: { 
          x: 0, 
          y: 0, 
          z: 0, 
          width: STICKY_NOTE.WIDTH, 
          height: STICKY_NOTE.HEIGHT, 
          expanded: false 
        },
      })),
      ...playlists.map(playlist => ({
        id: `playlist-${playlist.slug}`,
        type: 'playlist' as const,
        data: playlist,
        position: { 
          x: 0, 
          y: 0, 
          z: 0, 
          width: STICKY_NOTE.WIDTH, 
          height: STICKY_NOTE.HEIGHT, 
          expanded: false 
        },
      })),
    ];

    // Merge saved positions if available
    const saved = loadPositions();
    const layoutedItems = calculateInitialLayout(initialItems);
    const merged = layoutedItems.map(item => {
      const savedPos = (saved as any)[item.id];
      return savedPos ? { ...item, position: { ...item.position, ...savedPos } } : item;
    });
    setItems(merged);
  }, [albums, snips, playlists, setItems]);

  useEffect(() => {
    initializeItems();
  }, [initializeItems]);

  const onDragStart = useCallback(
    (id: string, event: React.MouseEvent) => {
      markManualInteraction();
      handleDragStart(id, event);
    },
    [handleDragStart, markManualInteraction]
  );

  // Initialize view based on device type
  const initializeView = useCallback(() => {
    if (isMobile) {
      // On mobile, start with a lower scale and no offset
      // We'll let the auto-focus handle proper centering
      requestAnimationFrame(() => {
        updateTransform({ x: 0, y: 0, scale: 0.5 }, false);
      });
    } else {
      // On desktop, use the default centered view
      requestAnimationFrame(() => {
        updateTransform({ x: 0, y: 0, scale: 0.3 }, false);
      });
    }
  }, [updateTransform, isMobile]);

  useEffect(() => {
    initializeView();
  }, [initializeView]);

  // Auto-focus deep-linked card if present; otherwise first card
  useEffect(() => {
    if (items.length === 0 || hasAutoFocusedRef.current) return;

    if (hasDeepLink) {
      const targetIndex = items.findIndex(item =>
        item.type === routeType && (item.data as any).slug === routeSlug
      );
      if (targetIndex >= 0) {
        hasAutoFocusedRef.current = true;
        focusOnCard(targetIndex);
        return;
      }
    }

    hasAutoFocusedRef.current = true;
    const timer = setTimeout(() => {
      focusOnCard(0);
    }, isMobile ? 1000 : 1500);
    return () => clearTimeout(timer);
  }, [items, hasDeepLink, routeType, routeSlug, focusOnCard, isMobile]);

  // Persist positions whenever items change
  useEffect(() => {
    if (items.length > 0) {
      savePositions(items);
    }
  }, [items]);

  return (
    <ErrorBoundary>
      {/* Simple clean background without window */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
        <div
          className={`transform-container ${isTransitioning ? 'is-transitioning' : ''}`}
          style={{
            "--translateX": `${transform.x}px`,
            "--translateY": `${transform.y}px`,
            "--scale": transform.scale,
          } as React.CSSProperties}
          // Disable manual gestures on mobile, keep them on desktop
          {...(!isMobile && {
            onWheel: handleWheel,
            onMouseDown: onGestureStart,
            onMouseMove: handleGestureMove,
            onMouseUp: handleGestureEnd,
            onMouseLeave: handleGestureEnd,
            onTouchStart: onGestureStart,
            onTouchMove: handleGestureMove,
            onTouchEnd: handleGestureEnd,
          })}
        >
          <WhiteboardContent
            items={laidOutItems}
            focusedCardId={focusedCardId}
            draggingId={dragging}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onExpand={handleExpand}
            onLongPress={handleLongPress}
            photosByAlbum={photosByAlbum}
          />
        </div>
        
        {/* Tag filter panel */}
        <TagFilterPanel
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={(tag) => {
            setSelectedTags(prev => {
              const next = new Set(prev);
              if (next.has(tag)) next.delete(tag); else next.add(tag);
              return next;
            });
          }}
          matchAll={matchAll}
          onToggleMatchAll={() => setMatchAll(v => !v)}
        />

        <WhiteboardToolbar
          onZoomIn={onZoomInMarked}
          onZoomOut={onZoomOutMarked}
          onCenter={onCenterMarked}
          scale={transform.scale}
          minScale={SCALES.MIN}
          onFocusPrev={onFocusPrevMarked}
          onFocusNext={onFocusNextMarked}
          onClusterToggle={() => {
            setItems(prev => {
              const next = clustered ? calculateInitialLayout(prev) : calculateClusteredLayout(prev);
              return next;
            });
            setClustered(v => !v);
          }}
        />
      </div>
    </ErrorBoundary>
  );
}