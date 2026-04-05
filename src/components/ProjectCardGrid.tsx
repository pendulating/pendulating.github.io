import type { CollectionEntry } from "astro:content";
import { useCallback, useMemo, useRef, useState } from "react";
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

  return (
    <ProjectCardGridContext.Provider value={contextValue}>
      <div
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
