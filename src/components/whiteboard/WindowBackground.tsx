import React from 'react';

interface WindowBackgroundProps {
  vistaUrl: string;
  brainTheme: 'dark' | 'light';
  isMobile: boolean;
}

export const WindowBackground = React.memo(({ vistaUrl, brainTheme, isMobile }: WindowBackgroundProps) => {
  return (
    <div className="whiteboard-background" aria-hidden>
      {/* Outside view: the vista */}
      <div 
        className="outside-view"
        style={{
          backgroundImage: `url(${vistaUrl})`,
          filter: brainTheme === 'dark' 
            ? `brightness(0.6) saturate(1.1) blur(10px)` 
            : `brightness(1.05) saturate(1.1) blur(10px)`
        } as React.CSSProperties}
      />
      {/* Frosted glass effect */}
      <div className="frosted-glass" />
      {/* Glass grain/noise */}
      <div className="glass-grain" />
      {/* Glass imperfections (dirt/smudges) */}
      <div className="glass-imperfections" />
      {/* Window frame and muntins */}
      <div className="window-frame" />
      {/* Aged vignette */}
      <div className="window-vignette" />
    </div>
  );
});

WindowBackground.displayName = 'WindowBackground';

