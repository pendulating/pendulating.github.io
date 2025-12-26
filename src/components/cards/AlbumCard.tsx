import React, { useCallback, useRef, useState } from 'react';
import type { CollectionEntry } from 'astro:content';
import type { WhiteboardItem, PhotoData } from '../../types/whiteboard';
import CardWrapper from './CardWrapper';

// Omit onResize and onDragStart from HTMLAttributes to avoid conflicts
interface AlbumCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onResize' | 'onDragStart'> {
  item: WhiteboardItem;
  id: string;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (id: string, event: React.MouseEvent) => void;
  onExpand: (id: string, cardElement?: HTMLElement | null) => void;
  onDragEnd: () => void;
  onResizeToContent?: (id: string, cardElement?: HTMLElement | null) => void;
  photos: PhotoData[];
  isFocused: boolean;
}

export function AlbumCard({
  item,
  id,
  isDragging,
  isResizing,
  onDragStart,
  onExpand,
  onDragEnd,
  onResizeToContent,
  photos = [],
  isFocused,
  ...rest
}: AlbumCardProps) {
  const album = item.data as CollectionEntry<"albums">;
  // Strip .md extension from album.id when comparing
  const albumIdWithoutExt = album.id.replace('.md', '');
  const albumPhotos = photos.filter(photo => photo.data.albumId === albumIdWithoutExt);
  const descriptionText = album.data.description?.trim() || '';
  const hasDescription = Boolean(descriptionText);
  
  // Clean body text by removing common template artifacts
  const rawBody = album.body?.trim() || '';
  const bodyText = rawBody
    .replace(/^###\s*(?:Description|Description & Photos|Photos|Images)\s*\n+/i, '')
    .trim();

  const showBody = Boolean(bodyText && 
    bodyText.toLowerCase() !== descriptionText.toLowerCase() && 
    bodyText.toLowerCase() !== album.data.title?.trim().toLowerCase());
  const [enlargedPhoto, setEnlargedPhoto] = useState<PhotoData | null>(null);
  const contentRootRef = useRef<HTMLDivElement | null>(null);

  const handleTileClick = useCallback((photo: PhotoData) => {
    setEnlargedPhoto(prev => (prev && prev.slug === photo.slug ? null : photo));
  }, []);

  const resizeParentToContent = useCallback((target?: HTMLElement | null) => {
    try {
      const base = target || contentRootRef.current || undefined;
      const cardElement = (base as HTMLElement | null)?.closest?.('.sticky-note') as HTMLElement | null
        || (base as HTMLElement | null)?.closest?.('.draggable-area') as HTMLElement | null
        || null;
      onResizeToContent && onResizeToContent(id, cardElement || undefined);
    } catch {}
  }, [id, onResizeToContent]);

  // Enhanced debug logging
  //console.group('AlbumCard Render Debug');
  //console.log('Album ID (with ext):', album.id);
  //console.log('Album ID (without ext):', albumIdWithoutExt);
  //console.log('Album Data:', album.data);
  //console.log('Photo Album IDs:', photos.map(p => p.data.albumId));
  //console.log('Filtered Album Photos:', albumPhotos);
  //console.groupEnd();

  return (
    <CardWrapper
      item={item}
      id={id}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}

      onExpand={(id, cardElement) => onExpand(id, cardElement)}
      isFocused={isFocused}
    >
      <div
        {...rest}
        className={`relative w-full h-full bg-gray-900/90 backdrop-blur-sm 
                      rounded-lg border border-cyan-500/30 overflow-hidden`}
      >
        <div className="p-4 h-full" ref={contentRootRef}>
          <h3 className="text-lg font-mono text-cyan-400 mb-3">{album.data.title}</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {albumPhotos.slice(0, 3).map(photo => {
              const isEnlarged = enlargedPhoto && enlargedPhoto.slug === photo.slug;
              if (isEnlarged) {
                return (
                  <div
                    key={photo.slug}
                    className="col-span-3 relative overflow-hidden rounded border border-cyan-500/20 bg-gray-800/40 cursor-zoom-out"
                    onClick={() => {
                      setEnlargedPhoto(null);
                      // Double rAF to ensure DOM has updated before measuring
                      requestAnimationFrame(() => requestAnimationFrame(() => resizeParentToContent(contentRootRef.current)));
                    }}
                  >
                    <img
                      src={photo.optimizedPhoto.src}
                      alt={photo.data.caption}
                      className="w-full h-auto max-h-[480px] object-contain"
                      onLoad={() => requestAnimationFrame(() => requestAnimationFrame(() => resizeParentToContent(contentRootRef.current)))}
                    />
                    <div className="flex items-center justify-between px-3 py-2 text-xs text-cyan-300/80">
                      <span className="truncate">{photo.data.caption}</span>
                      <button
                        className="px-2 py-1 rounded bg-gray-900/70 border border-cyan-500/30 hover:bg-cyan-900/30 transition"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEnlargedPhoto(null);
                          requestAnimationFrame(() => requestAnimationFrame(() => resizeParentToContent(contentRootRef.current)));
                        }}
                      >
                        Shrink
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={photo.slug}
                  className="relative aspect-square overflow-hidden rounded border border-cyan-500/20 group cursor-zoom-in"
                  onClick={() => {
                    handleTileClick(photo);
                    requestAnimationFrame(() => requestAnimationFrame(() => resizeParentToContent(contentRootRef.current)));
                  }}
                >
                  {photo.optimizedPhoto && (
                    <img 
                      src={photo.optimizedPhoto.src} 
                      alt={photo.data.caption} 
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-xs text-white/90 truncate">{photo.data.caption}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hasDescription && (
            <p className="text-sm text-gray-300/90">
              {album.data.description}
            </p>
          )}
          
          {/* Add album body content if available and different from description/title */}
          {showBody && (
            <div className="mt-3 p-3 bg-gray-800/50 rounded border border-cyan-500/20">
              <div className="text-sm text-cyan-300/90 whitespace-pre-wrap break-words">
                {bodyText}
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-2 mt-3">
            {album.data.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 text-xs rounded-full bg-cyan-950/50 
                           text-cyan-400/90 border border-cyan-500/20 font-mono 
                           tracking-tight"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </CardWrapper>
  );
}