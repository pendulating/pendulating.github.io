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

  // On touch devices, expand whichever card is closest to the viewport
  // center as the user scrolls. Uses a throttled scroll listener for
  // smooth, predictable updates (one check per frame).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (mq.matches) return; // desktop — skip

    const grid = gridRef.current;
    if (!grid) return;

    let rafId = 0;
    let currentSlug: string | null = null;

    const pickFocusedCard = () => {
      const cards = grid.querySelectorAll<HTMLElement>(".project-card[data-slug]");
      if (!cards.length) return;

      const viewportCenter = window.innerHeight / 2;
      let closest: HTMLElement | null = null;
      let closestDist = Infinity;

      cards.forEach((card) => {
        const rect = card.getBoundingClientRect();
        const cardCenter = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenter - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = card;
        }
      });

      if (closest) {
        const slug = closest.dataset.slug!;
        if (slug !== currentSlug) {
          currentSlug = slug;
          setExpandedCardId(slug);
        }
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(pickFocusedCard);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Run once on mount to expand the initially visible card.
    pickFocusedCard();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
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
