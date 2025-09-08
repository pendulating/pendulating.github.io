import React from 'react';

interface TagFilterPanelProps {
  allTags: string[];
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
  matchAll: boolean;
  onToggleMatchAll: () => void;
  theme?: 'dark' | 'light';
}

export const TagFilterPanel: React.FC<TagFilterPanelProps> = ({
  allTags,
  selectedTags,
  onToggleTag,
  matchAll,
  onToggleMatchAll,
  theme = 'dark'
}) => {
  if (!allTags.length) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 sm:z-50 w-[95vw] sm:w-[85vw] pointer-events-auto"
      style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8px)' }}
    >
      <div className={`relative mx-auto rounded-full px-2 py-1 sm:px-3 sm:py-2 backdrop-blur-md shadow-lg ${
        theme === 'dark' ? 'bg-black/85 border border-cyan-500/20' : 'bg-white/90 border border-zinc-300'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Match mode toggle */}
          <button
            onClick={onToggleMatchAll}
            className={`px-3 py-1.5 sm:px-2 sm:py-1 text-[12px] sm:text-xs rounded-full font-mono ${
              theme === 'dark' ? 'bg-cyan-950/50 text-cyan-400/90 border border-cyan-500/20' : 'bg-zinc-100 text-zinc-700 border border-zinc-300'
            }`}
            title={matchAll ? 'Match all selected tags' : 'Match any selected tags'}
          >
            {matchAll ? 'ALL' : 'ANY'}
          </button>

          {/* Scrollable tag list */}
          <div className="flex-1 no-scrollbar max-h-28 overflow-y-auto sm:max-h-none sm:overflow-y-visible sm:overflow-x-auto">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 min-w-[unset] sm:min-w-max pr-2">
              {allTags.map(tag => {
                const active = selectedTags.has(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTag(tag)}
                    className={`px-3 py-1.5 sm:px-2 sm:py-1 min-w-[84px] text-[12px] sm:text-xs rounded-full border font-mono whitespace-nowrap transition-colors ${
                      active
                        ? (theme === 'dark' ? 'bg-cyan-600/30 border-cyan-400/60 text-cyan-200' : 'bg-sky-200/80 border-sky-400/60 text-sky-800')
                        : (theme === 'dark' ? 'bg-cyan-950/40 border-cyan-500/20 text-cyan-400/90 hover:text-cyan-300' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:text-zinc-900')
                    }`}
                    title={tag}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gradient edges to hint scroll on mobile */}
          {theme === 'dark' ? (
            <>
              <div className="hidden sm:block pointer-events-none absolute left-0 top-0 h-full w-6 rounded-l-full bg-gradient-to-r from-black/70 to-transparent" />
              <div className="hidden sm:block pointer-events-none absolute right-0 top-0 h-full w-6 rounded-r-full bg-gradient-to-l from-black/70 to-transparent" />
            </>
          ) : (
            <>
              <div className="hidden sm:block pointer-events-none absolute left-0 top-0 h-full w-6 rounded-l-full bg-gradient-to-r from-white/90 to-transparent" />
              <div className="hidden sm:block pointer-events-none absolute right-0 top-0 h-full w-6 rounded-r-full bg-gradient-to-l from-white/90 to-transparent" />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagFilterPanel;


