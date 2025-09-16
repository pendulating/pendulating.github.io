import React from 'react';
import { ZoomIn, ZoomOut, Home, ArrowLeft, ArrowRight, MoreHorizontal, Shapes, Sun, Moon } from 'lucide-react';

interface WhiteboardToolbarProps {
  onZoomIn: (animate?: boolean) => void;
  onZoomOut: (animate?: boolean) => void;
  onCenter: () => void;
  scale: number;
  minScale: number;
  onFocusPrev: () => void;
  onFocusNext: () => void;
  onClusterToggle?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const WhiteboardToolbar: React.FC<WhiteboardToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onCenter,
  scale,
  minScale,
  onFocusPrev,
  onFocusNext,
  onClusterToggle,
  theme = 'dark',
  onToggleTheme
}) => {
  // State to track if expanded menu is open (for mobile view)
  const [expanded, setExpanded] = React.useState(false);

  // Check if we're on mobile to hide manual zoom controls
  const isMobile = typeof window !== 'undefined' && (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    window.innerWidth <= 768
  );

  // Theme-aware styling to mirror TagFilterPanel
  const containerTone = theme === 'dark'
    ? 'bg-black/85 border border-cyan-500/20'
    : 'bg-white/90 border border-zinc-300';
  const actionTone = theme === 'dark'
    ? 'text-cyan-400 hover:text-cyan-300'
    : 'text-zinc-700 hover:text-zinc-900';
  const percentTone = theme === 'dark' ? 'text-cyan-400' : 'text-zinc-700';

  // Primary controls always visible - prioritize navigation on mobile
  const primaryControls = (
    <>
      {/* Navigation controls first for mobile */}
      <button 
        onClick={onFocusPrev}
        className={`p-2 sm:p-3 ${actionTone} transition-colors flex items-center justify-center`}
        title="Focus Previous Card"
      >
        <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
      </button>
      
      <button 
        onClick={onFocusNext}
        className={`p-2 sm:p-3 ${actionTone} transition-colors flex items-center justify-center`}
        title="Focus Next Card"
      >
        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
      </button>
      
      {/* Keep home button in primary for easy reset */}
      <button 
        onClick={onCenter} 
        className={`p-2 sm:p-3 ${actionTone} transition-colors flex items-center justify-center`}
        title="Center View"
      >
        <Home className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
      </button>
      
      {/* On larger screens, always show zoom percentage */}
      <span className={`hidden sm:inline-block text-sm sm:text-base font-mono w-16 sm:w-20 text-center ${percentTone} font-bold`}>
        {Math.round(scale * 100)}%
      </span>
    </>
  );

  // Secondary controls that collapse on mobile
  const secondaryControls = (
    <>
      {/* Hide zoom controls on mobile since gestures are disabled */}
      {!isMobile && (
        <>
          <button 
            onClick={() => onZoomOut(true)}
            className={`p-2 ${actionTone} transition-colors disabled:opacity-50 flex items-center justify-center`}
            disabled={scale <= minScale}
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" strokeWidth={1.5} />
          </button>
          
          <button 
            onClick={() => onZoomIn(true)}
            className={`p-2 ${actionTone} transition-colors disabled:opacity-50 flex items-center justify-center`}
            disabled={scale >= 1.5}
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </>
      )}
      
      {/* Only show percentage in expanded menu on mobile */}
      <span className={`text-sm font-mono text-center ${percentTone} font-bold sm:hidden`}>
        {Math.round(scale * 100)}%
      </span>
    </>
  );

  // For desktop, we want to show all controls in one row
  const desktopControls = (
    <>
      <button 
        onClick={() => onZoomOut(true)}
        className={`hidden sm:flex p-3 ${actionTone} transition-colors disabled:opacity-50 items-center justify-center`}
        disabled={scale <= minScale}
        title="Zoom Out"
      >
        <ZoomOut className="w-6 h-6" />
      </button>
      
      <button 
        onClick={() => onZoomIn(true)}
        className={`hidden sm:flex p-3 ${actionTone} transition-colors disabled:opacity-50 items-center justify-center`}
        disabled={scale >= 1.5}
        title="Zoom In"
      >
        <ZoomIn className="w-6 h-6" strokeWidth={1.5} />
      </button>
    </>
  );

  return (
    <div className="fixed bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-50">
      {/* Main toolbar */}
      <div className={`rounded-full px-3 sm:px-6 py-2 sm:py-3 backdrop-blur-md shadow-lg flex items-center gap-2 sm:gap-6 ${containerTone}`}>
        {primaryControls}
        
        {/* Desktop-only controls */}
        {desktopControls}

        {/* Cluster toggle */}
        {onClusterToggle && (
          <button 
            onClick={onClusterToggle}
            className={`hidden sm:flex p-3 ${actionTone} transition-colors items-center justify-center`}
            title="Cluster by Type"
          >
            <Shapes className="w-6 h-6" strokeWidth={1.5} />
          </button>
        )}
        
        {/* Theme toggle - desktop only */}
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme}
            className={`hidden sm:flex p-3 ${actionTone} transition-colors items-center justify-center`}
            title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
          >
            {theme === 'dark' ? <Sun className="w-6 h-6" strokeWidth={1.5} /> : <Moon className="w-6 h-6" strokeWidth={1.5} />}
          </button>
        )}

        {/* On mobile, show a "more" button that expands to show secondary controls */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className={`p-2 ${actionTone} transition-colors sm:hidden flex items-center justify-center`}
          title="More Controls"
        >
          <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
        </button>
      </div>
      
      {/* Expanded mobile controls */}
      {expanded && (
        <div className={`mt-2 rounded-full px-3 py-2 backdrop-blur-md shadow-lg flex sm:hidden items-center justify-center gap-4 transition-all duration-200 ease-in-out ${containerTone}`}>
          {secondaryControls}
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme}
              className={`p-2 ${actionTone} transition-colors items-center justify-center`}
              title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" strokeWidth={1.5} /> : <Moon className="w-5 h-5" strokeWidth={1.5} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
};