import type { WhiteboardItem, WhiteboardItemPosition } from '../types/whiteboard';

const STORAGE_KEY = 'whiteboard_positions_v1';

export type SavedPositions = Record<string, WhiteboardItemPosition> & Record<string, any>;

export function loadPositions(): SavedPositions {
  if (typeof window === 'undefined') return {} as SavedPositions;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {} as SavedPositions;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as SavedPositions;
    }
  } catch {
    // ignore
  }
  return {} as SavedPositions;
}

export function savePositions(items: WhiteboardItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    const toSave: SavedPositions = {} as SavedPositions;
    for (const item of items) {
      toSave[item.id] = { ...item.position } as WhiteboardItemPosition;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // ignore
  }
}


