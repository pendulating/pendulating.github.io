import { slugifyStr } from "@utils/slugify";
import type { CollectionEntry } from "astro:content";
import { useState, useRef, useEffect } from "react";

export interface Props {
  project: CollectionEntry<"projects">;
  secHeading?: boolean;
}

export default function ProjectCard({ project, secHeading = true }: Props) {
  const { data, slug } = project;
  const { venue, title, tag, description, youtubeId, href, pdf, site, code, bib } = data;
  
  // State for description visibility
  const [showDescription, setShowDescription] = useState(false);
  // State for BibTeX visibility
  const [showBib, setShowBib] = useState(false);
  // State for animation progress
  const [animatedText, setAnimatedText] = useState("");
  // Ref for the description container
  const descriptionRef = useRef<HTMLDivElement>(null);
  
  // Function to get YouTube embed URL from ID or full URL
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
    className: "text-base font-medium line-clamp-2",
  };

  // Animation effect when description is shown
  useEffect(() => {
    if (showDescription && description) {
      console.log("Starting animation for description");
      setAnimatedText("");
      let currentIndex = 0;
      const typingSpeed = 8; // Changed from 20ms to 5ms per character for faster typing
      
      const typingInterval = setInterval(() => {
        if (currentIndex < description.length) {
          // Fix for the missing first character - append to current text instead of replacing
          setAnimatedText(description.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, typingSpeed);
      
      return () => clearInterval(typingInterval);
    }
  }, [showDescription, description]);

  const toggleDescription = () => {
    console.log("Toggle description clicked, current state:", showDescription);
    setShowDescription(!showDescription);
    if (showBib) setShowBib(false);
  };

  const toggleBib = () => {
    setShowBib(!showBib);
    if (showDescription) setShowDescription(false);
  };

  return (
    <li className="project-card">
      {/* Project header with venue and tag - now clearly at the top */}
      <div className="project-header">
        <span className="project-venue line-clamp-1">{venue}</span>{" "}
        {tag && <span className="project-tag">{tag}</span>}
      </div>
      
      {/* Title link */}
      <a
        href={href}
        className="project-title-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {secHeading ? (
          <h2 {...headerProps}>{title}</h2>
        ) : (
          <h3 {...headerProps}>{title}</h3>
        )}
      </a>

      {/* Square media container */}
      <div className="project-media-container">
        {data.image ? (
          <img 
            src={data.image.src} 
            alt={title} 
            className="project-image"
            width={data.image.width}
            height={data.image.height}
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

      {/* Action buttons */}
      <div className="project-links">
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
            className={`project-button desc-button ${showDescription ? 'active' : ''}`}
            aria-expanded={showDescription}
          >
            {showDescription ? "×" : "abs"}
          </button>
        )}
      </div>
      
      {/* Inline description */}
      {showDescription && description && (
        <div 
          className="project-description-inline"
          ref={descriptionRef}
        >
          <div className="typing-text">
            {animatedText}
            <span className="typing-cursor">|</span>
          </div>
        </div>
      )}
      
      {/* BibTeX content */}
      {bib && showBib && (
        <div className="project-bib mt-2">
          <pre className="bib-content">{bib}</pre>
        </div>
      )}
    </li>
  );
}