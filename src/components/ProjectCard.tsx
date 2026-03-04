import { slugifyStr } from "@utils/slugify";
import type { CollectionEntry } from "astro:content";
import type { FocusEvent, KeyboardEvent, MouseEvent } from "react";
import { useState, useRef, useEffect } from "react";

export interface Props {
  project: CollectionEntry<"projects">;
  secHeading?: boolean;
}

export default function ProjectCard({ project, secHeading = true }: Props) {
  const { data, slug } = project;
  const { venue, title, tag, description, youtubeId, href, pdf, site, code, bib } = data;

  const [showDescription, setShowDescription] = useState(false);
  const [showBib, setShowBib] = useState(false);
  const [animatedText, setAnimatedText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHoverCapable, setIsHoverCapable] = useState(false);

  const cardRef = useRef<HTMLElement>(null);
  const metadataRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const collapseTimeoutRef = useRef<number | null>(null);
  const pointerRef = useRef({ x: -1, y: -1 });

  const getYoutubeEmbedUrl = (id: string) => {
    if (id.includes('youtube.com') || id.includes('youtu.be')) {
      const urlObj = new URL(id);
      if (id.includes('youtube.com')) {
        return `https://www.youtube.com/embed/${urlObj.searchParams.get('v')}`;
      } else if (id.includes('youtu.be')) {
        return `https://www.youtube.com/embed/${urlObj.pathname.substring(1)}`;
      }
    }
    return `https://www.youtube.com/embed/${id}`;
  };

  const headerProps = {
    style: { viewTransitionName: slugifyStr(title) },
    className: "project-title",
  };
  const imageSrc = typeof data.image === "string" ? data.image : data.image?.src;
  const imageWidth = typeof data.image === "string" ? undefined : data.image?.width;
  const imageHeight = typeof data.image === "string" ? undefined : data.image?.height;

  useEffect(() => {
    if (showDescription && description) {
      setAnimatedText("");
      let currentIndex = 0;
      const typingSpeed = 8;
      
      const typingInterval = setInterval(() => {
        if (currentIndex < description.length) {
          setAnimatedText(description.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, typingSpeed);
      
      return () => clearInterval(typingInterval);
    }
  }, [showDescription, description]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const updateInteractionMode = () => setIsHoverCapable(mediaQuery.matches);

    updateInteractionMode();
    mediaQuery.addEventListener("change", updateInteractionMode);
    return () => mediaQuery.removeEventListener("change", updateInteractionMode);
  }, []);

  useEffect(() => {
    if (!isHoverCapable) return;

    const trackPointer = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("pointermove", trackPointer, { passive: true });
    return () => window.removeEventListener("pointermove", trackPointer);
  }, [isHoverCapable]);

  const clearCollapseTimer = () => {
    if (collapseTimeoutRef.current !== null) {
      window.clearTimeout(collapseTimeoutRef.current);
      collapseTimeoutRef.current = null;
    }
  };

  const isPointerWithinIntentZone = () => {
    if (!cardRef.current) return false;

    const { x, y } = pointerRef.current;
    if (x < 0 || y < 0) return false;

    const cardRect = cardRef.current.getBoundingClientRect();
    const metadataRect = metadataRef.current?.getBoundingClientRect();
    const actionsRect = actionsRef.current?.getBoundingClientRect();

    const baseZone = {
      left: cardRect.left - 16,
      right: cardRect.right + 120,
      top: cardRect.top - 12,
      bottom: cardRect.bottom + 12,
    };

    let intentZone = baseZone;

    if (metadataRect) {
      intentZone = {
        left: Math.min(intentZone.left, metadataRect.left - 24),
        right: Math.max(intentZone.right, metadataRect.right + 120),
        top: Math.min(intentZone.top, metadataRect.top - 16),
        bottom: Math.max(intentZone.bottom, metadataRect.bottom + 18),
      };
    }

    if (actionsRect) {
      intentZone = {
        left: Math.min(intentZone.left, actionsRect.left - 32),
        right: Math.max(intentZone.right, actionsRect.right + 140),
        top: Math.min(intentZone.top, actionsRect.top - 18),
        bottom: Math.max(intentZone.bottom, actionsRect.bottom + 24),
      };
    }

    return (
      x >= intentZone.left &&
      x <= intentZone.right &&
      y >= intentZone.top &&
      y <= intentZone.bottom
    );
  };

  const scheduleCollapse = (delay = 200) => {
    if (!isHoverCapable) return;
    clearCollapseTimer();
    collapseTimeoutRef.current = window.setTimeout(() => {
      if (isPointerWithinIntentZone()) {
        scheduleCollapse(140);
        return;
      }
      setIsExpanded(false);
      setShowDescription(false);
      setShowBib(false);
    }, delay);
  };

  useEffect(() => {
    return () => {
      clearCollapseTimer();
    };
  }, []);

  const toggleDescription = () => {
    setIsExpanded(true);
    setShowDescription(!showDescription);
    if (showBib) setShowBib(false);
  };

  const toggleBib = () => {
    setIsExpanded(true);
    setShowBib(!showBib);
    if (showDescription) setShowDescription(false);
  };

  const handleCardMouseEnter = () => {
    if (!isHoverCapable) return;
    clearCollapseTimer();
    setIsExpanded(true);
  };

  const handleCardMouseLeave = () => {
    if (!isHoverCapable) return;
    scheduleCollapse();
  };

  const handleCardFocus = () => {
    clearCollapseTimer();
    setIsExpanded(true);
  };

  const handleCardBlur = (event: FocusEvent<HTMLElement>) => {
    const nextFocused = event.relatedTarget as Node | null;
    if (nextFocused && cardRef.current?.contains(nextFocused)) return;

    if (isHoverCapable) {
      scheduleCollapse(125);
      return;
    }

    setIsExpanded(false);
    setShowDescription(false);
    setShowBib(false);
  };

  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    if (isHoverCapable) return;
    const target = event.target as HTMLElement;
    if (target.closest("a, button")) return;
    setIsExpanded(prev => !prev);
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setIsExpanded(prev => !prev);
    }
    if (event.key === "Escape") {
      setIsExpanded(false);
      setShowDescription(false);
      setShowBib(false);
    }
  };

  return (
    <article
      ref={cardRef}
      className={`project-card ${isExpanded ? "is-expanded" : "is-minimized"}`}
      data-expanded={isExpanded}
      tabIndex={0}
      aria-expanded={isExpanded}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      onFocus={handleCardFocus}
      onBlur={handleCardBlur}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="project-layout">
        <div className="project-media-container">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={title}
              className="project-image"
              width={imageWidth}
              height={imageHeight}
              loading="lazy"
            />
          ) : youtubeId ? (
            <div className="project-video-container">
              <iframe
                className="project-video"
                src={getYoutubeEmbedUrl(youtubeId)}
                title={title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              ></iframe>
            </div>
          ) : (
            <div className="project-empty-media"></div>
          )}
        </div>

        <div ref={metadataRef} className="project-meta">
          <div className="project-header">
            <span className="project-venue line-clamp-1">{venue}</span>
            {tag && <span className="project-tag">{tag}</span>}
          </div>

          <a
            href={href}
            className="project-title-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {secHeading ? <h2 {...headerProps}>{title}</h2> : <h3 {...headerProps}>{title}</h3>}
          </a>

          <div
            ref={actionsRef}
            className="project-links"
            aria-hidden={!isExpanded}
          >
            {pdf && (
              <a href={pdf} target="_blank" rel="noopener noreferrer" className="project-button pdf-button">
                paper
              </a>
            )}
            {site && (
              <a href={site} target="_blank" rel="noopener noreferrer" className="project-button site-button">
                news-highlight
              </a>
            )}
            {code && (
              <a href={code} target="_blank" rel="noopener noreferrer" className="project-button code-button">
                code
              </a>
            )}
            {bib && (
              <button onClick={toggleBib} className="project-button bib-button">
                cite
              </button>
            )}
            {description && (
              <button
                onClick={toggleDescription}
                className={`project-button desc-button ${showDescription ? "active" : ""}`}
                aria-expanded={showDescription}
              >
                {showDescription ? "×" : "abs"}
              </button>
            )}
          </div>

          {showDescription && description && (
            <div className="project-description-inline" ref={descriptionRef}>
              <div className="typing-text">
                {animatedText}
                <span className="typing-cursor">|</span>
              </div>
            </div>
          )}

          {bib && showBib && (
            <div className="project-bib mt-2">
              <pre className="bib-content">{bib}</pre>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}