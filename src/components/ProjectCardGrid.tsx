import type { CollectionEntry } from "astro:content";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ProjectCard from "./ProjectCard";
import { ProjectCardGridContext } from "./ProjectCardGridContext";

export interface ProjectCardGridProps {
  projects: CollectionEntry<"projects">[];
  className?: string;
  /** Delay in ms before collapsing when cursor leaves the grid. Default 220. */
  collapseDelay?: number;
}

export default function ProjectCardGrid({
  projects,
  className = "project-grid",
  collapseDelay = 220,
}: ProjectCardGridProps) {
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const collapseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCollapseTimer = useCallback(() => {
    if (collapseTimeoutRef.current !== null) {
      clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  }, []);

  const handleGridMouseLeave = useCallback(() => {
    clearCollapseTimer();
    collapseTimeoutRef.current = setTimeout(() => {
      setExpandedCardId(null);
      collapseTimeoutRef.current = null;
    }, collapseDelay);
  }, [clearCollapseTimer, collapseDelay]);

  const contextValue = useMemo(
    () => ({
      expandedCardId,
      setExpandedCardId,
      collapseDelay,
      collapseTimeoutRef,
    }),
    [expandedCardId, collapseDelay],
  );

  const gridRef = useRef<HTMLDivElement>(null);

  // On mobile (no hover), expand whichever card is closest to the viewport
  // center as the user scrolls — no tapping required.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (mq.matches) return; // desktop — skip

    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(
      grid.querySelectorAll<HTMLElement>(".project-card"),
    );
    if (!cards.length) return;

    // Observe a narrow band in the center of the viewport (middle 30%).
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry with the highest intersection ratio.
        let best: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            (!best || entry.intersectionRatio > best.intersectionRatio)
          ) {
            best = entry;
          }
        }
        if (best) {
          const slug = (best.target as HTMLElement).dataset.slug;
          if (slug) setExpandedCardId(slug);
        }
      },
      {
        // Shrink the observation root so only the middle ~30% of viewport counts.
        rootMargin: "-35% 0px -35% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <ProjectCardGridContext.Provider value={contextValue}>
      <div
        ref={gridRef}
        className={className}
        onMouseLeave={handleGridMouseLeave}
      >
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </ProjectCardGridContext.Provider>
  );
}

export { ProjectCardGridContext };
