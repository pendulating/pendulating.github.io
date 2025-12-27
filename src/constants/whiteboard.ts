export const SCALES = {
  MIN: 0.334,   // Set to 0.334 to ensure the 300vw window scene always covers the viewport
  INITIAL: 0.4, // Initial zoom for good overview
  MAX: 2        // Can zoom in to read notes
} as const;

export const STICKY_NOTE = {
  WIDTH: 280,   // in pixels
  HEIGHT: 320,  // in pixels
  MIN_WIDTH: 120,
  MIN_HEIGHT: 120,
  MAX_WIDTH: 500,  // Increased for wider content
  MAX_HEIGHT: 800  // Increased significantly for long text content
} as const;