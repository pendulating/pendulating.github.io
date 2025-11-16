import { memo, useMemo, useCallback } from "react";
import type { CollectionEntry } from "astro:content";

interface ProjectTileListProps {
  projects: CollectionEntry<"projects">[];
  onProjectClick: (project: CollectionEntry<"projects">) => void;
  selectedProject: CollectionEntry<"projects"> | null;
}

function ProjectTileList({
  projects,
  onProjectClick,
  selectedProject,
}: ProjectTileListProps) {
  const selectedSlug = selectedProject?.slug;
  const handleClick = useCallback((project: CollectionEntry<"projects">) => onProjectClick(project), [onProjectClick]);
  const items = useMemo(() => projects, [projects]);
  return (
    <div className="project-tile-list">
      <div className="project-tiles-container">
        {items.map((project) => {
          const isSelected = selectedSlug === project.slug;
          const hasImage = project.data.image;

          return (
            <div
              key={project.slug}
              className={`project-tile ${isSelected ? "selected" : ""}`}
              onClick={() => handleClick(project)}
            >
              {hasImage ? (
                <img
                  src={project.data.image.src}
                  alt={project.data.title}
                  className="project-tile-image"
                  loading="lazy"
                />
              ) : (
                <div className="project-tile-placeholder">
                  <span className="project-tile-title-placeholder">
                    {project.data.title}
                  </span>
                </div>
              )}
              <div className="project-tile-overlay">
                <span className="project-tile-title">{project.data.title}</span>
                <span className="project-tile-venue">{project.data.venue}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(ProjectTileList);

