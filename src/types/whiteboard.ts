import type { ImageMetadata } from 'astro';
import type { CollectionEntry } from 'astro:content';
import type { MouseEvent, TouchEvent } from 'react';

// Core geometry types
export type Point = {
  x: number;
  y: number;
};

export type Transform = {
  x: number;
  y: number;
  scale: number;
};

export type Position = Point & {
  z: number;
  width: number;
  height: number;
  expanded: boolean;
  rotation?: number;
};

// Item types
export type WhiteboardItemType = 'album' | 'snip' | 'playlist';

export interface WhiteboardItemPosition {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  expanded: boolean;
  rotation?: number;
}

export interface WhiteboardItem {
  id: string;
  type: WhiteboardItemType;
  data: CollectionEntry<"albums"> | CollectionEntry<"snips"> | CollectionEntry<"playlists">;
  position: WhiteboardItemPosition;
}

// Add this interface for photo data
export interface PhotoData {
  id: string;
  slug: string;
  data: {
    albumId: string;
    caption: string;
    photo: any;
  };
  optimizedPhoto: ImageMetadata;
}

// Component prop types
export interface WhiteboardContentProps {
  items: WhiteboardItem[];
  focusedCardId?: string | null;
  draggingId: string | null;  // Allow null

  onDragStart: (id: string, event: React.MouseEvent) => void;
  onDragEnd: (id: string) => void;
  onExpand: (id: string, cardElement?: HTMLElement | null) => void;
  onResizeToContent?: (id: string, cardElement?: HTMLElement | null) => void;

  photosByAlbum: Record<string, PhotoData[]>;
}

export interface CardWrapperProps {
  item: WhiteboardItem;
  isDragging: boolean;
  isResizing: boolean;
  onDragStart: (itemId: string) => void;
  onDragMove: (itemId: string, newPosition: Point) => void;
  children: React.ReactNode;
}

// Props types
export type WhiteboardProps = {
  albums: CollectionEntry<'albums'>[];
  photosByAlbum: Record<string, PhotoData[]>;
  snips: CollectionEntry<'snips'>[];
  playlists: CollectionEntry<'playlists'>[];
  backgroundImage?: string;
  useOptimizedRendering?: boolean;
  performanceMode?: 'mobile' | 'desktop';
};

export interface CardDimensions {
  WIDTH: number;
  HEIGHT: number;
  MIN_WIDTH: number;
  MIN_HEIGHT: number;
  MAX_WIDTH: number;
  MAX_HEIGHT: number;
}

// Hook types
export type FilterType = 'all' | WhiteboardItemType;