import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { CollectionEntry } from 'astro:content';
import type { WhiteboardItem } from '../../types/whiteboard';
import CardWrapper from './CardWrapper';

interface PlaylistCardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onResize' | 'onDragStart' | 'onResizeToContent'> {
  item: WhiteboardItem;
  id: string;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (id: string, event: React.MouseEvent) => void;
  onExpand: (id: string, cardElement?: HTMLElement | null) => void;
  onDragEnd: () => void;
  onResizeToContent?: (id: string, cardElement?: HTMLElement | null) => void;
  isFocused: boolean;
}

export function PlaylistCard({
  item,
  id,
  isDragging,
  isResizing,
  onDragStart,
  onExpand,
  onDragEnd,
  onResizeToContent,

  isFocused,
  ...rest
}: PlaylistCardProps) {
  const playlist = item.data as CollectionEntry<"playlists">;
  const contentRef = useRef<HTMLDivElement>(null);
  const playlistId = useMemo(() => {
    const url = playlist.data.playlistUrl || '';
    const parts = url.split('/').filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : '';
  }, [playlist.data.playlistUrl]);
  const [embedCode, setEmbedCode] = useState<JSX.Element | null>(null);
  const shouldLoad = isFocused || !!item.position.expanded;
  const hasDescription = Boolean(playlist.data.description && playlist.data.description.trim());

  useEffect(() => {
    if (!shouldLoad) {
      setEmbedCode(null);
      return;
    }
    if (!contentRef.current) return;
    const availableHeight = item.position.height - 80;
    let newEmbedCode: JSX.Element | null = null;
    if (playlist.data.platform === 'spotify' && playlistId) {
      newEmbedCode = (
        <iframe
          title="Spotify Embed"
          src={`https://open.spotify.com/embed/playlist/${playlistId}`}
          width="100%"
          height={availableHeight}
          style={{ maxHeight: '380px' }}
          allowTransparency={true}
          allow="encrypted-media"
        />
      );
    } else if (playlist.data.platform === 'apple' && playlistId) {
      newEmbedCode = (
        <iframe
          title="Apple Music Embed"
          src={`https://embed.music.apple.com/us/playlist/${playlistId}`}
          width="100%"
          height={availableHeight}
          style={{ maxHeight: '380px' }}
          allowTransparency={true}
          allow="encrypted-media"
        />
      );
    }
    setEmbedCode(newEmbedCode);
  }, [shouldLoad, playlist.data.platform, playlistId, item.position.height]);

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
        ref={contentRef}
        {...rest}
        className={`relative w-full h-full bg-gray-900/90 backdrop-blur-sm 
                   rounded-lg border border-cyan-500/30 overflow-hidden p-4`}
      >
        <h3 className="text-lg font-mono text-cyan-400 mb-2">{playlist.data.title}</h3>
        {hasDescription && (
          <p className="text-sm text-gray-300/90 mb-4">{playlist.data.description}</p>
        )}
        
        {/* Platform badge */}
        <div className="mb-3">
          <span className="px-2 py-1 text-xs rounded-full bg-cyan-950/50 
                         text-cyan-400/90 border border-cyan-500/20 font-mono">
            {playlist.data.platform}
          </span>
        </div>
        
        {/* Add playlist body content if available */}
        {playlist.body && playlist.body.trim() && (
          <div className="mb-4 p-3 bg-gray-800/50 rounded border border-cyan-500/20">
            <div className="text-sm text-cyan-300/90 whitespace-pre-wrap break-words">
              {playlist.body}
            </div>
          </div>
        )}
        
        {embedCode || (
          <div className="w-full h-40 flex items-center justify-center text-cyan-400/70 border border-cyan-500/20 rounded bg-gray-800/30">
            {!shouldLoad ? 'Focus or expand to load embed' : (playlistId ? 'Loading...' : 'No playlist URL provided')}
          </div>
        )}
      </div>
    </CardWrapper>
  );
}