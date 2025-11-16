import { useEffect, memo } from "react";
import type { CollectionEntry } from "astro:content";
import ProjectCard from "./ProjectCard";

interface ProjectModalProps {
  project: CollectionEntry<"projects"> | null;
  isOpen: boolean;
  onClose: () => void;
  screenPosition?: { x: number; y: number };
}

function ProjectModal({ project, isOpen, onClose, screenPosition }: ProjectModalProps) {
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !project) return null;

  const floatingStyle = screenPosition
    ? { position: 'absolute' as const, left: screenPosition.x, top: screenPosition.y, transform: 'translate(-50%, calc(-100% - 16px))' }
    : undefined;

  return (
    <div className="project-modal-floating" style={floatingStyle}>
      <button 
        className="project-modal-close"
        onClick={onClose}
        aria-label="Close modal"
      >
        ×
      </button>
      <ProjectCard project={project} secHeading={true} />
    </div>
  );
}

export default memo(ProjectModal);

