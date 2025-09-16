import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import type { WhiteboardProps, WhiteboardItem, PhotoData, Transform } from '../types/whiteboard';
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
import '../styles/whiteboard.css';
import vistaUrl from '../assets/vista.jpg?url';

// Debug flag to control logging
const DEBUG = false;
const SHOW_DEBUG_HUD = false;

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
      // Under translate(tx,ty) scale(s), to center world (x,y): t = -s * [x,y]
      const newTransform: Transform = {
        x: -cardX * targetScale,
        y: -cardY * targetScale,
        scale: targetScale
      };
      
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
    handleResizeToContent,
  } = useWhiteboardItems({
    onZoomToFit: handleZoomToFit
  });

  // Focus hook will be bound to focusableItems further below
  let currentIndex = 0 as number;
  let onFocusPrev = (() => {}) as () => void;
  let onFocusNext = (() => {}) as () => void;
  let focusOnCard = ((_i: number) => {}) as (index: number) => void;
  let focusedCardId: string | undefined = undefined;

  // Cluster toggle state
  const [clustered, setClustered] = useState(false);

  // Track recent manual interactions to guard auto-focus
  const lastManualInteractionRef = useRef<number>(0);
  const markManualInteraction = useCallback(() => {
    lastManualInteractionRef.current = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  }, []);
  const tagFocusDebounceRef = useRef<number | undefined>(undefined);

  // Tag filtering state
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [matchAll, setMatchAll] = useState(false);

  // Track previous tag filter to ensure autofocus only runs on real tag changes
  const prevTagKeyRef = useRef<string>('');
  const prevMatchAllRef = useRef<boolean>(false);

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

  // Brain theme (dark/light): default to system preference if available, else dark
  const [brainTheme, setBrainTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const saved = window.localStorage.getItem('brain_theme');
      if (saved === 'light' || saved === 'dark') return saved as 'light' | 'dark';
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
      return 'dark';
    } catch {
      return 'dark';
    }
  });
  // Track whether user has explicitly overridden system theme
  const [themeSource, setThemeSource] = useState<'system' | 'user'>(() => {
    if (typeof window === 'undefined') return 'system';
    try { return window.localStorage.getItem('brain_theme') ? 'user' : 'system'; } catch { return 'system'; }
  });
  // Persist only when user explicitly toggles
  useEffect(() => {
    if (themeSource !== 'user') return;
    try { window.localStorage.setItem('brain_theme', brainTheme); } catch {}
  }, [brainTheme, themeSource]);
  // Listen to system changes if using system theme
  useEffect(() => {
    if (themeSource !== 'system' || typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e: MediaQueryListEvent) => setBrainTheme(e.matches ? 'light' : 'dark');
    try { mq.addEventListener('change', handler); } catch { mq.addListener(handler); }
    return () => {
      try { mq.removeEventListener('change', handler); } catch { mq.removeListener(handler); }
    };
  }, [themeSource]);
  const toggleBrainTheme = useCallback(() => {
    setThemeSource('user');
    setBrainTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try { window.localStorage.setItem('brain_theme', next); } catch {}
      return next;
    });
  }, []);

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

    // Keep world positions intact so dragging continues to work.
    // Only hide non-matching items by moving them far off-screen.
    return items.map(it => {
      if (isMatch(it)) return it;
      return {
        ...it,
        position: { ...it.position, x: it.position.x + 10000, y: it.position.y + 10000 }
      };
    });
  }, [items, selectedTags, matchAll, clustered]);

  // Compute focusable items from current filter using laid-out positions
  const focusableItems = useMemo(() => {
    if (selectedTags.size === 0) return laidOutItems;
    const selected = selectedTags;
    const isMatch = (it: any) => {
      const tags: string[] = Array.isArray(it?.data?.data?.tags) ? it.data.data.tags : [];
      return matchAll
        ? Array.from(selected).every(t => tags.includes(t))
        : Array.from(selected).some(t => tags.includes(t));
    };
    return laidOutItems.filter(isMatch);
  }, [laidOutItems, selectedTags, matchAll]);

  // Helper: focus by DOM-derived position (works with laidOutItems)
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768
  );

  // Bind focus hook to focusableItems to avoid ghost indices
  const focusHook = useCardFocus(focusableItems, transform, updateTransform);
  currentIndex = focusHook.currentIndex;
  onFocusPrev = focusHook.onFocusPrev;
  onFocusNext = focusHook.onFocusNext;
  focusOnCard = focusHook.focusOnCard;
  focusedCardId = focusableItems.length ? focusableItems[currentIndex]?.id : undefined;

  // Track last focused world position to choose nearest card after filter changes
  const lastFocusedPositionRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!focusedCardId) return;
    const current = focusableItems.find(it => it.id === focusedCardId)
      || laidOutItems.find(it => it.id === focusedCardId)
      || items.find(it => it.id === focusedCardId);
    if (current) {
      lastFocusedPositionRef.current = { x: current.position.x, y: current.position.y };
    }
  }, [focusedCardId, focusableItems, laidOutItems, items]);

  // Autofocus on tag toggle: if the active focus would change due to filtering,
  // smoothly move the camera to the chosen target card. Runs ONLY when tag filter changes.
  useEffect(() => {
    // Build a stable signature for the current tag filter
    const tagKey = Array.from(selectedTags).sort().join('|');
    const tagChanged = prevTagKeyRef.current !== tagKey || prevMatchAllRef.current !== matchAll;
    if (!tagChanged) return; // Ignore runs caused by unrelated re-renders (e.g., pan/zoom)
    prevTagKeyRef.current = tagKey;
    prevMatchAllRef.current = matchAll;

    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    if (now - lastManualInteractionRef.current < 500) return;
    const visibleIds = focusableItems.map(it => it.id);
    if (visibleIds.length === 0) return;
    // Debounce during rapid toggles
    if (tagFocusDebounceRef.current) {
      clearTimeout(tagFocusDebounceRef.current);
    }
    tagFocusDebounceRef.current = window.setTimeout(() => {
      // Determine target focus index
      let targetIndex = 0;
      if (focusedCardId && visibleIds.includes(focusedCardId)) {
        targetIndex = focusableItems.findIndex(it => it.id === focusedCardId);
        if (targetIndex < 0) targetIndex = 0;
      } else {
        // Choose nearest to previous focused position if available
        const prev = lastFocusedPositionRef.current;
        if (prev && focusableItems.length > 0) {
          let bestIdx = 0;
          let bestDist = Number.POSITIVE_INFINITY;
          for (let i = 0; i < focusableItems.length; i++) {
            const p = focusableItems[i].position;
            const dx = p.x - prev.x;
            const dy = p.y - prev.y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestDist) { bestDist = d2; bestIdx = i; }
          }
          targetIndex = bestIdx;
        }
      }
      // Ensure layout has applied before centering; double rAF for safety
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          focusOnCard(targetIndex);
        });
      });
    }, 250);

    return () => {
      if (tagFocusDebounceRef.current) {
        clearTimeout(tagFocusDebounceRef.current);
        tagFocusDebounceRef.current = undefined;
      }
    };
  }, [selectedTags, matchAll, focusableItems, focusedCardId, focusOnCard]);

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

  // Capture-phase start to allow panning even when clicking on cards when Shift is held
  const onGestureStartCapture = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const onCard = !!target.closest('.draggable-area');
    const isModifierPan = (e.shiftKey || e.metaKey || e.altKey || e.button === 1);
    if (onCard && !isModifierPan) {
      return; // let card drag handle this
    }
    markManualInteraction();
    handleGestureStart(e);
    // prevent card drag from starting when we intend to pan
    if (onCard) {
      e.stopPropagation();
      e.preventDefault();
    }
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
      // If panning is active (or user is starting a modifier-pan), skip card drag
      const isModifierPan = (event.shiftKey || event.metaKey || event.altKey || event.button === 1);
      if (isPanning || isModifierPan) return;
      handleDragStart(id, event);
    },
    [handleDragStart, markManualInteraction, isPanning]
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

  // Auto-focus deep-linked card (all devices); otherwise first card (mobile/coarse only)
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

    // Only auto-focus first card on mobile/coarse-pointer devices
    const isMobileDevice = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isCoarsePointer = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    if (!(isMobileDevice || isCoarsePointer)) {
      return;
    }

    hasAutoFocusedRef.current = true;
    const timer = setTimeout(() => {
      focusOnCard(0);
    }, 1000);
    return () => clearTimeout(timer);
  }, [items, hasDeepLink, routeType, routeSlug, focusOnCard]);

  // Persist positions whenever items change
  useEffect(() => {
    if (items.length > 0) {
      savePositions(items);
    }
  }, [items]);

  return (
    <ErrorBoundary>
      {/* Simple clean background without window */}
      <div className={`fixed inset-0 ${brainTheme === 'dark' ? 'bg-gradient-to-br from-slate-800 to-slate-900' : 'bg-gradient-to-br from-zinc-50 to-zinc-200'}`}>
        {/* Top-left Home button */}
        <a href="/" className={`fixed top-3 left-3 z-[60] rounded-full border px-3 py-2 font-mono text-xs ${brainTheme === 'dark' ? 'bg-black/80 border-cyan-500/20 text-cyan-300' : 'bg-white/90 border-zinc-300 text-zinc-700'} hover:opacity-90 transition`}>Home</a>
        {/* DEBUG: camera/centering overlay - must NOT be inside transformed container */}
        {SHOW_DEBUG_HUD && (
          <div className="debug-hud">
            {(() => {
              const scale = transform.scale.toFixed(3);
              const tx = transform.x.toFixed(2);
              const ty = transform.y.toFixed(2);
              const focused = focusedCardId ? laidOutItems.find(it => it.id === focusedCardId) : undefined;
              let world = 'n/a';
              let screen = 'n/a';
              let delta = 'n/a';
              try {
                if (focused) {
                  const cx = focused.position.x;
                  const cy = focused.position.y;
                  world = `${cx.toFixed(1)}, ${cy.toFixed(1)}`;
                  const el = document.querySelector(`[data-item-id="${focused.id}"]`) as HTMLElement | null;
                  if (el) {
                    const r = el.getBoundingClientRect();
                    const sx = (r.left + r.width / 2).toFixed(1);
                    const sy = (r.top + r.height / 2).toFixed(1);
                    screen = `${sx}, ${sy}`;
                    const dx = (r.left + r.width / 2) - window.innerWidth / 2;
                    const dy = (r.top + r.height / 2) - window.innerHeight / 2;
                    delta = `${dx.toFixed(1)}, ${dy.toFixed(1)}`;
                  }
                }
              } catch {}
              return (
                <div>
                  <div>scale: {scale}</div>
                  <div>translate: {tx}, {ty}</div>
                  <div>focused: {focusedCardId || 'none'}</div>
                  <div>worldCenter: {world}</div>
                  <div>screenCenter: {screen}</div>
                  <div>delta(px): {delta}</div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Full viewport gesture catcher on the container */}
        <div
          className={`transform-container ${isTransitioning ? 'is-transitioning' : ''}`}
          style={{
            "--translateX": `${transform.x}px`,
            "--translateY": `${transform.y}px`,
            "--scale": transform.scale,
          } as React.CSSProperties}
          {...(!isMobile && {
            onWheel: handleWheel,
            onMouseDownCapture: onGestureStartCapture,
            onMouseDown: onGestureStart,
            onMouseMove: handleGestureMove,
            onMouseUp: handleGestureEnd,
            onMouseLeave: handleGestureEnd,
            onTouchStart: onGestureStart,
            onTouchMove: handleGestureMove,
            onTouchEnd: handleGestureEnd,
          })}
        >
          <div className="world">
          {/* World-space painting background that follows camera */}
          <div
            className="whiteboard-background"
            aria-hidden
            style={{
              backgroundImage: `url(${vistaUrl})`,
              // Subtle theme-aware tint to keep notes readable
              filter: brainTheme === 'dark' ? 'brightness(0.7) saturate(1.05)' : 'brightness(0.95) saturate(1.05)'
            } as React.CSSProperties}
          />

          <WhiteboardContent
            items={laidOutItems}
            focusedCardId={focusedCardId}
            draggingId={dragging}
            onDragStart={onDragStart}
            onDragEnd={handleDragEnd}
            onExpand={handleExpand}
            onResizeToContent={handleResizeToContent}
            photosByAlbum={photosByAlbum}
          />
          </div>
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
          theme={brainTheme}
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
          theme={brainTheme}
          onToggleTheme={toggleBrainTheme}
        />
      </div>
    </ErrorBoundary>
  );
}