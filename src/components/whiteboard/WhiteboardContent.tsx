import React from 'react';
import type { WhiteboardContentProps, PhotoData } from '../../types/whiteboard';
import { AlbumCard } from '../cards/AlbumCard';
import { SnipCard } from '../cards/SnipCard';
import { PlaylistCard } from '../cards/PlaylistCard';

export const WhiteboardContent = React.memo(function WhiteboardContent({
  items,
  focusedCardId,
  draggingId,

  onDragStart,
  onDragEnd,
  onExpand,
  onResizeToContent,
  photosByAlbum,
}: WhiteboardContentProps) {
  // Add more detailed logging
  //console.group('WhiteboardContent Render Debug');
  //console.log('Photos by Album:', {
  //  hasPhotos: !!photosByAlbum,
  //  albumIds: Object.keys(photosByAlbum || {}),
  //  totalPhotos: Object.values(photosByAlbum || {}).flat().length,
  //  photosByAlbumContent: photosByAlbum // Log the actual content
  //});
  //console.groupEnd();

  return (
    <>
      {items.map((item) => {
        const isFocused = item.id === focusedCardId;
        // Get album ID without .md extension for photo lookup
        const albumId = item.type === 'album' ? 
          item.data.id.replace('.md', '') : null;

        const cardProps = {
          item,
          id: item.id,
          isDragging: item.id === draggingId,
          isResizing: false, // Removed resize functionality
          onDragStart,
          onDragEnd: () => onDragEnd(item.id),
          onExpand: (id: string, cardElement?: HTMLElement | null) => onExpand(id, cardElement),
          onResizeToContent,
          isFocused,
          // Use the cleaned albumId to look up photos
          photos: item.type === 'album' && albumId ? 
            (photosByAlbum[albumId] || []) : []
        };

        //console.log(`Card Props for ${item.id}:`, {
        //  type: item.type,
        //  albumId,
        //  hasPhotos: item.type === 'album' ? 
        //    !!photosByAlbum[albumId] : false,
        //  photoCount: item.type === 'album' && photosByAlbum[albumId] ? 
        //    photosByAlbum[albumId].length : 0
        //});

        return (
          <React.Fragment key={item.id}>
            {item.type === 'album' && <AlbumCard {...cardProps} />}
            {item.type === 'snip' && <SnipCard {...cardProps} />}
            {item.type === 'playlist' && <PlaylistCard {...cardProps} />}
          </React.Fragment>
        );
      })}
    </>
  );
});