import { useState, useMemo, useEffect, useRef, useCallback, useTransition } from "react";
import Map, { type MapRef } from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { ScatterplotLayer, IconLayer, GeoJsonLayer, PolygonLayer } from "@deck.gl/layers";
import type { CollectionEntry } from "astro:content";
import type { PickingInfo } from "@deck.gl/core";
import ProjectModal from "./ProjectModal";
import ProjectTileList from "./ProjectTileList";
import { getProjectCoordinates, computeGeojsonCentroid } from "@utils/geojsonCentroid";
import { cropGeojsonByPolygon } from "@utils/geojsonCrop";
import "maplibre-gl/dist/maplibre-gl.css";
import { convertRobotabilityTable, type RobotabilityFeature, type RobotabilityBounds } from "@utils/convertRobotabilityGeoarrow";

interface ProjectMapViewProps {
  projects: CollectionEntry<"projects">[];
}

// NYC-centered initial view state
const INITIAL_VIEW_STATE = {
  longitude: -73.965,
  latitude: 40.760,
  zoom: 11.5,
  pitch: 0,
  bearing: 0,
  minZoom: 10,
  maxZoom: 14,
};

// CARTO basemap style
const BASE_MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

// Category colors
const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  "dense-street-imagery": [59, 130, 246], // Blue
  "tools-for-public-space": [34, 197, 94], // Green
  "computational-social-science": [168, 85, 247], // Purple
};

// Helper function to interpolate color based on value (0-1)
const getColorFromValue = (value: number, opacity: number): [number, number, number, number] => {
  // Clamp value between 0 and 1
  const clampedValue = Math.max(0, Math.min(1, value));

  // Use a blue-to-red colormap (viridis-like)
  // Low values (0) = blue, high values (1) = red
  if (clampedValue < 0.25) {
    // Blue to cyan
    const t = clampedValue / 0.25;
    return [
      Math.round(68 * (1 - t) + 34 * t),
      Math.round(1 * (1 - t) + 139 * t),
      Math.round(84 * (1 - t) + 230 * t),
      opacity,
    ];
  } else if (clampedValue < 0.5) {
    // Cyan to green
    const t = (clampedValue - 0.25) / 0.25;
    return [
      Math.round(34 * (1 - t) + 34 * t),
      Math.round(139 * (1 - t) + 197 * t),
      Math.round(230 * (1 - t) + 94 * t),
      opacity,
    ];
  } else if (clampedValue < 0.75) {
    // Green to yellow
    const t = (clampedValue - 0.5) / 0.25;
    return [
      Math.round(34 * (1 - t) + 253 * t),
      Math.round(197 * (1 - t) + 224 * t),
      Math.round(94 * (1 - t) + 71 * t),
      opacity,
    ];
  } else {
    // Yellow to red
    const t = (clampedValue - 0.75) / 0.25;
    return [
      Math.round(253 * (1 - t) + 239 * t),
      Math.round(224 * (1 - t) + 68 * t),
      Math.round(71 * (1 - t) + 68 * t),
      opacity,
    ];
  }
};

// Easing functions for smooth animations
const easeInOutCubic = (t: number): number => {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const easeInQuad = (t: number): number => {
  return t * t;
};

const easeInOutSine = (t: number): number => {
  return -(Math.cos(Math.PI * t) - 1) / 2;
};

const easeInCubic = (t: number): number => {
  return t * t * t;
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

const smootherstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const ROBOTABILITY_MIN_MAX: [number, number] = [0, 100];
const ROBOTABILITY_COLOR_STOPS: Array<{ t: number; color: [number, number, number] }> = [
  { t: 0, color: [37, 99, 235] }, // deep blue
  { t: 0.33, color: [34, 197, 94] }, // green
  { t: 0.66, color: [252, 211, 77] }, // golden yellow
  { t: 1, color: [239, 68, 68] }, // red
];

const getRobotabilityColor = (score: number, alpha: number): [number, number, number, number] => {
  const [min, max] = ROBOTABILITY_MIN_MAX;
  const normalized = Math.max(0, Math.min(1, (score - min) / (max - min)));

  let lower = ROBOTABILITY_COLOR_STOPS[0];
  let upper = ROBOTABILITY_COLOR_STOPS[ROBOTABILITY_COLOR_STOPS.length - 1];
  for (let i = 0; i < ROBOTABILITY_COLOR_STOPS.length - 1; i++) {
    const current = ROBOTABILITY_COLOR_STOPS[i];
    const next = ROBOTABILITY_COLOR_STOPS[i + 1];
    if (normalized >= current.t && normalized <= next.t) {
      lower = current;
      upper = next;
      break;
    }
  }

  const segmentSpan = Math.max(upper.t - lower.t, 1e-6);
  const localT = Math.max(0, Math.min(1, (normalized - lower.t) / segmentSpan));
  const r = Math.round(lower.color[0] + (upper.color[0] - lower.color[0]) * localT);
  const g = Math.round(lower.color[1] + (upper.color[1] - lower.color[1]) * localT);
  const b = Math.round(lower.color[2] + (upper.color[2] - lower.color[2]) * localT);
  return [r, g, b, Math.round(alpha)];
};

export default function ProjectMapView({ projects }: ProjectMapViewProps) {
  const [selectedProject, setSelectedProject] = useState<CollectionEntry<"projects"> | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    object: any;
    x: number;
    y: number;
  } | null>(null);
  const [mapStyle, setMapStyle] = useState<any>(null);
  const [loadedGeojson, setLoadedGeojson] = useState<Record<string, any>>({});
  const [expansionProgress, setExpansionProgress] = useState<Record<string, number>>({});
  const [collapsingProjects, setCollapsingProjects] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [robotabilityFeatures, setRobotabilityFeatures] = useState<RobotabilityFeature[] | null>(null);
  const [robotabilityBounds, setRobotabilityBounds] = useState<RobotabilityBounds | null>(null);
  const [baseMapStyle, setBaseMapStyle] = useState<any | null>(null);
  const [prefersDarkMode, setPrefersDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  
  // Use ref to track previous selected project
  const previousProjectRef = useRef<CollectionEntry<"projects"> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapRef | null>(null);
  const [modalScreenPos, setModalScreenPos] = useState<{ x: number; y: number } | null>(null);
  const modalRafRef = useRef<number | null>(null);

  // Throttle hover updates with rAF to reduce React state churn
  const hoverInfoRef = useRef<typeof hoverInfo>(null);
  const hoverRafRef = useRef<number | null>(null);
  const setHoverInfoThrottled = useCallback((next: typeof hoverInfo) => {
    hoverInfoRef.current = next;
    if (hoverRafRef.current == null) {
      hoverRafRef.current = requestAnimationFrame(() => {
        hoverRafRef.current = null;
        setHoverInfo(hoverInfoRef.current);
      });
    }
  }, []);

  // Keep track of system color scheme
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDarkMode(event.matches);
    };

    // Set initial value
    setPrefersDarkMode(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  // Load and cache the basemap style
  useEffect(() => {
    fetch(BASE_MAP_STYLE)
      .then((response) => response.json())
      .then((style) => {
        setBaseMapStyle(style);
      })
      .catch((error) => {
        console.error("Error loading map style:", error);
        setBaseMapStyle(null);
        setMapStyle({
          version: 8,
          sources: {},
          layers: [],
        });
      });
  }, []);

  // Update map style whenever the theme or base style changes
  useEffect(() => {
    if (!baseMapStyle) return;

    const lineColor = prefersDarkMode ? "#FFFFFF" : "#000000";

    const filteredLayers = baseMapStyle.layers
      .filter((layer: any) => layer.type === "line")
      .map((layer: any) => ({
        ...layer,
          paint: {
          ...(layer.paint || {}),
          "line-color": lineColor,
          },
      }));
        
        setMapStyle({
      ...baseMapStyle,
          layers: filteredLayers,
        });
  }, [baseMapStyle, prefersDarkMode]);

  // Fetch GeoJSON data from URLs
  useEffect(() => {
    const fetchGeojson = async () => {
      const geojsonData: Record<string, any> = {};
      
      for (const project of projects) {
        if (project.data.geojsonUrl) {
          try {
            const response = await fetch(project.data.geojsonUrl);
            const data = await response.json();
            geojsonData[project.slug] = data;
          } catch (error) {
            console.error(`Error loading GeoJSON for ${project.slug}:`, error);
          }
        }
      }
      
      setLoadedGeojson(geojsonData);
    };
    
    fetchGeojson();
  }, [projects]);

  // Stable callbacks
  const handleProjectClick = useCallback((project: CollectionEntry<"projects">) => {
    startTransition(() => {
      setSelectedProject(project);
    });
  }, [startTransition]);

  const handleCloseModal = useCallback(() => {
    startTransition(() => {
      setSelectedProject(null);
    });
  }, [startTransition]);

  const handleLayerHover = useCallback((info: PickingInfo) => {
    if (info.object) {
      setHoverInfoThrottled({
        object: info.object,
        x: info.x,
        y: info.y,
      });
    } else {
      setHoverInfoThrottled(null);
    }
  }, [setHoverInfoThrottled]);

  useEffect(() => {
    return () => {
      if (hoverRafRef.current != null) cancelAnimationFrame(hoverRafRef.current);
      if (modalRafRef.current != null) cancelAnimationFrame(modalRafRef.current);
    };
  }, []);

  // Handle project selection changes - trigger expand/collapse animations
  useEffect(() => {
    const previousProject = previousProjectRef.current;
    
    // If there's a previous project and it's different from current, collapse it
    if (previousProject && previousProject.slug !== selectedProject?.slug) {
      const slug = previousProject.slug;
      
      // Get the current progress at the moment of deselection
      setExpansionProgress(prev => {
        const currentProgress = prev[slug] || 0;
        
        if (currentProgress > 0) {
          // Mark as collapsing
          setCollapsingProjects(prevCollapsing => new Set(prevCollapsing).add(slug));
          
          const startTime = Date.now();
          const duration = 900;
          const startProgress = currentProgress;
          
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const linearProgress = Math.min(elapsed / duration, 1);
            
            // Apply easing function for smooth collapse
            const easedProgress = easeInCubic(linearProgress);
            
            // Progress goes from current value down to 0
            const newProgress = startProgress * (1 - easedProgress);
            
            const nextProgress = Math.max(0, Math.round(newProgress * 1000) / 1000);
            setExpansionProgress(current => {
              const curr = current[slug] ?? 0;
              if (Math.abs(nextProgress - curr) < 0.002) return current;
              return {
              ...current,
                [slug]: nextProgress
              };
            });
            
            if (linearProgress < 1) {
              requestAnimationFrame(animate);
            } else {
              // Animation complete - clean up
              setExpansionProgress(current => {
                const next = { ...current };
                delete next[slug];
                return next;
              });
              setCollapsingProjects(current => {
                const next = new Set(current);
                next.delete(slug);
                return next;
              });
            }
          };
          
          requestAnimationFrame(animate);
        }
        
        return prev;
      });
    }
    
    // If there's a new selected project, expand it
    if (selectedProject) {
      const slug = selectedProject.slug;
      
      // Remove from collapsing set if it was collapsing
      setCollapsingProjects(prev => {
        const next = new Set(prev);
        next.delete(slug);
        return next;
      });
      
      const startTime = Date.now();
      const duration = 1400;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const linearProgress = Math.min(elapsed / duration, 1);
        
        // Apply easing function for smooth expansion
        const easedProgress = easeInOutSine(linearProgress);
        
        setExpansionProgress(prev => {
          const current = prev[slug] ?? 0;
          const nextProgress = Math.round(easedProgress * 1000) / 1000; // gate tiny updates
          if (Math.abs(nextProgress - current) < 0.002) return prev;
          return {
          ...prev,
            [slug]: nextProgress
          };
        });
        
        if (linearProgress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    // Update ref for next render
    previousProjectRef.current = selectedProject;
  }, [selectedProject]);

  // Filter projects that have coordinates or geojson
  const projectsWithCoordinates = useMemo(() => {
    return projects.filter((project) => {
      // Check for loaded geojson first, then inline geojson, then coordinates
      const hasGeojson = loadedGeojson[project.slug] || project.data.geojson;
      if (hasGeojson) return true;
      
      const coords = getProjectCoordinates(project.data);
      return coords !== null;
    });
  }, [projects, loadedGeojson]);

  // Separate projects with and without custom icons
  const projectsWithIcons = useMemo(
    () => projectsWithCoordinates.filter((p) => p.data.icon),
    [projectsWithCoordinates]
  );
  
  const projectsWithoutIcons = useMemo(
    () => projectsWithCoordinates.filter((p) => !p.data.icon),
    [projectsWithCoordinates]
  );

  // Precompute coordinates for projects (avoid recomputing in accessors)
  const projectCoordsBySlug = useMemo(() => {
    const map: Record<string, [number, number] | null> = {};
    projectsWithCoordinates.forEach((p) => {
      map[p.slug] = getProjectCoordinates(p.data);
    });
    return map;
  }, [projectsWithCoordinates]);

  // Pre-compute bounding boxes for each project (only when projects change)
  const projectBounds = useMemo(() => {
    const boundsMap: Record<string, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {};
    projects.forEach((project) => {
      if (project.data.boundingPolygon) {
        const bounds = project.data.boundingPolygon.coordinates[0];
        boundsMap[project.slug] = {
          minLng: Math.min(...bounds.map((p: number[]) => p[0])),
          maxLng: Math.max(...bounds.map((p: number[]) => p[0])),
          minLat: Math.min(...bounds.map((p: number[]) => p[1])),
          maxLat: Math.max(...bounds.map((p: number[]) => p[1])),
        };
      }
    });
    return boundsMap;
  }, [projects]);

  // Precompute feature centroids for polygonal features once per dataset
  const processedGeojsonBySlug = useMemo(() => {
    const map: Record<string, any> = {};
    projects.forEach((project) => {
      const geojson = loadedGeojson[project.slug] || project.data.geojson;
      if (!geojson) return;
      try {
        if (geojson.type === 'FeatureCollection') {
          map[project.slug] = {
            ...geojson,
            features: geojson.features.map((feature: any) => {
              if (!feature || !feature.geometry) return feature;
              let centroid: [number, number] | null = null;
              try {
                centroid = computeGeojsonCentroid(feature.geometry as any);
              } catch (_) {
                centroid = null;
              }
              if (!centroid) return feature;
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  __centroid: centroid,
                },
              };
            }),
          };
        } else if (geojson.type === 'Feature') {
          let centroid: [number, number] | null = null;
          try {
            centroid = computeGeojsonCentroid(geojson.geometry as any);
          } catch (_) {
            centroid = null;
          }
          map[project.slug] = centroid
            ? { ...geojson, properties: { ...geojson.properties, __centroid: centroid } }
            : geojson;
        } else {
          // Bare geometry
          let centroid: [number, number] | null = null;
          try {
            centroid = computeGeojsonCentroid(geojson as any);
          } catch (_) {
            centroid = null;
          }
          map[project.slug] = centroid
            ? { type: 'Feature', geometry: geojson, properties: { __centroid: centroid } }
            : geojson;
        }
      } catch (e) {
        map[project.slug] = geojson;
      }
    });
    return map;
  }, [projects, loadedGeojson]);

  // Create deck.gl layers
  const layers = useMemo(() => {
    const layerArray = [];

    // Add GeoJSON layers for projects with geojson data
    projects.forEach((project) => {
      // Get preprocessed geojson with cached centroids if available
      const geojson = processedGeojsonBySlug[project.slug] || loadedGeojson[project.slug] || project.data.geojson;
      
      if (geojson) {
        const isSelected = selectedProject?.slug === project.slug;
        const isCollapsing = collapsingProjects.has(project.slug);
        const categoryColor = CATEGORY_COLORS[project.data.category] || [100, 100, 100];
        const bounds = projectBounds[project.slug];
        const progress = expansionProgress[project.slug] || 0;
        
        // Calculate the center of the bounding box for distance calculations
        const centerLng = bounds ? (bounds.minLng + bounds.maxLng) / 2 : 0;
        const centerLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 0;
        
        // Calculate max distance from center to corner of bounds (for normalization)
        // Use a much larger multiplier to ensure the wave covers the entire city
        const maxDistance = bounds 
          ? Math.sqrt(
              Math.pow(bounds.maxLng - centerLng, 2) + 
              Math.pow(bounds.maxLat - centerLat, 2)
            )
          : 0;
        
        layerArray.push(
          new GeoJsonLayer({
            id: `geojson-${project.slug}`,
            data: geojson, // Always use full geojson - deck.gl will efficiently diff
            pickable: true,
            stroked: true,
            filled: true,
            visible: true, // Always visible
            lineWidthMinPixels: isSelected ? 2 : 1,
            
            // Efficient accessor with radial expansion effect
            getFillColor: (d: any) => {
              // Use p_y property if available
              if (d.properties && typeof d.properties.p_y === 'number') {
                let opacity = 180;
                
                // Calculate distance-based visibility for expansion effect
                if (bounds) {
                  // Get feature centroid
                  let featureLng = 0, featureLat = 0;
                  const centroid = d.properties?.__centroid;
                  if (centroid && Array.isArray(centroid)) {
                    featureLng = centroid[0];
                    featureLat = centroid[1];
                  } else if (d.geometry.type === 'Polygon') {
                    const coords = d.geometry.coordinates[0];
                    featureLng = coords.reduce((sum: number, p: number[]) => sum + p[0], 0) / coords.length;
                    featureLat = coords.reduce((sum: number, p: number[]) => sum + p[1], 0) / coords.length;
                  } else if (d.geometry.type === 'MultiPolygon') {
                    const firstPoly = d.geometry.coordinates[0][0];
                    featureLng = firstPoly.reduce((sum: number, p: number[]) => sum + p[0], 0) / firstPoly.length;
                    featureLat = firstPoly.reduce((sum: number, p: number[]) => sum + p[1], 0) / firstPoly.length;
                  }
                  
                  // Calculate distance from the EDGE of the bounding box (not center)
                  // This makes the wave expand from the bounds, not from the centroid
                  let distanceFromBounds = 0;
                  
                  if (featureLng >= bounds.minLng && featureLng <= bounds.maxLng && 
                      featureLat >= bounds.minLat && featureLat <= bounds.maxLat) {
                    // Feature is inside bounds - distance is 0
                    distanceFromBounds = 0;
                  } else {
                    // Feature is outside bounds - calculate distance to nearest edge
                    const dLng = Math.max(bounds.minLng - featureLng, featureLng - bounds.maxLng, 0);
                    const dLat = Math.max(bounds.minLat - featureLat, featureLat - bounds.maxLat, 0);
                    distanceFromBounds = Math.sqrt(dLng * dLng + dLat * dLat);
                  }
                  
                  // Normalize distance (0 = at/inside bounds, >0 = outside bounds)
                  // Use a large multiplier to ensure the wave covers the entire city
                  const normalizedDistance = distanceFromBounds / (maxDistance * 15);
                  
                  // Calculate visibility based on expansion/collapse progress
                  if (isSelected || isCollapsing) {
                    // Expanding or collapsing: show features progressively based on distance
                    if (normalizedDistance <= progress) {
                      opacity = 180;
                    } else if (normalizedDistance <= progress + 0.35) {
                      // Smooth fade band to reduce popping
                      const fade = smootherstep(progress + 0.35, progress, normalizedDistance);
                      opacity = Math.round(180 * fade);
                    } else {
                      // Feature hasn't been reached yet (expanding) or already collapsed (collapsing)
                      opacity = 0;
                    }
                  } else {
                    // Not selected and not animating: only show features within original bounds
                    const inBounds = featureLng >= bounds.minLng && featureLng <= bounds.maxLng && 
                                     featureLat >= bounds.minLat && featureLat <= bounds.maxLat;
                    opacity = inBounds ? 120 : 0;
                  }
                } else {
                  // No bounds defined - show all features when selected
                  opacity = isSelected ? 180 : 120;
                }
                
                return getColorFromValue(d.properties.p_y, opacity);
              }
              return [...categoryColor, isSelected ? 120 : 80];
            },
            
            getLineColor: (d: any) => {
              if (d.properties && typeof d.properties.p_y === 'number') {
                let opacity = 255;
                
                if (bounds) {
                  let featureLng = 0, featureLat = 0;
                  const centroid = d.properties?.__centroid;
                  if (centroid && Array.isArray(centroid)) {
                    featureLng = centroid[0];
                    featureLat = centroid[1];
                  } else if (d.geometry.type === 'Polygon') {
                    const coords = d.geometry.coordinates[0];
                    featureLng = coords.reduce((sum: number, p: number[]) => sum + p[0], 0) / coords.length;
                    featureLat = coords.reduce((sum: number, p: number[]) => sum + p[1], 0) / coords.length;
                  } else if (d.geometry.type === 'MultiPolygon') {
                    const firstPoly = d.geometry.coordinates[0][0];
                    featureLng = firstPoly.reduce((sum: number, p: number[]) => sum + p[0], 0) / firstPoly.length;
                    featureLat = firstPoly.reduce((sum: number, p: number[]) => sum + p[1], 0) / firstPoly.length;
                  }
                  
                  // Calculate distance from the EDGE of the bounding box (not center)
                  let distanceFromBounds = 0;
                  
                  if (featureLng >= bounds.minLng && featureLng <= bounds.maxLng && 
                      featureLat >= bounds.minLat && featureLat <= bounds.maxLat) {
                    distanceFromBounds = 0;
                  } else {
                    const dLng = Math.max(bounds.minLng - featureLng, featureLng - bounds.maxLng, 0);
                    const dLat = Math.max(bounds.minLat - featureLat, featureLat - bounds.maxLat, 0);
                    distanceFromBounds = Math.sqrt(dLng * dLng + dLat * dLat);
                  }
                  
                  const normalizedDistance = distanceFromBounds / (maxDistance * 15);
                  
                  if (isSelected || isCollapsing) {
                    if (normalizedDistance <= progress) {
                      opacity = 255;
                    } else if (normalizedDistance <= progress + 0.35) {
                      const fade = smootherstep(progress + 0.35, progress, normalizedDistance);
                      opacity = Math.round(255 * fade);
                    } else {
                      opacity = 0;
                    }
                  } else {
                    const inBounds = featureLng >= bounds.minLng && featureLng <= bounds.maxLng && 
                                     featureLat >= bounds.minLat && featureLat <= bounds.maxLat;
                    opacity = inBounds ? 255 : 0;
                  }
                } else {
                  // No bounds defined - show all features when selected
                  opacity = isSelected ? 255 : 255;
                }
                
                const color = getColorFromValue(d.properties.p_y, opacity);
                return [color[0], color[1], color[2], opacity];
              }
              return [...categoryColor, isSelected ? 200 : 150];
            },
            
            getLineWidth: isSelected ? 2 : 1,
            
            onClick: (info: PickingInfo) => {
              if (info.object) {
                startTransition(() => {
                  setSelectedProject(project);
                });
              }
            },
            
            // Tell deck.gl when to recalculate attributes
            updateTriggers: {
              getFillColor: [isSelected, isCollapsing, progress],
              getLineColor: [isSelected, isCollapsing, progress],
              getLineWidth: [isSelected],
            },
          })
        );
      }
    });

    // Layer for projects without custom icons (colored dots)
    if (projectsWithoutIcons.length > 0) {
      layerArray.push(
        new ScatterplotLayer({
          id: "project-markers-dots",
          data: projectsWithoutIcons,
          getPosition: (d: CollectionEntry<"projects">) => projectCoordsBySlug[d.slug] || [0, 0],
          getFillColor: (d: CollectionEntry<"projects">) => {
            const color = CATEGORY_COLORS[d.data.category] || [100, 100, 100];
            return [...color, 200];
          },
          getRadius: 300,
          radiusMinPixels: 8,
          radiusMaxPixels: 20,
          pickable: true,
          onClick: (info: PickingInfo) => {
            if (info.object) {
              startTransition(() => {
                setSelectedProject(info.object as CollectionEntry<"projects">);
              });
            }
          },
          onHover: handleLayerHover,
          updateTriggers: {
            getFillColor: [projectsWithoutIcons],
          },
          stroked: true,
          lineWidthMinPixels: 2,
          getLineColor: [255, 255, 255, 255],
        })
      );
    }

    // Robotability polygon layer
    if (robotabilityFeatures?.length) {
      const isSelectedRobotability = selectedProject?.slug === 'robotability';
      const robotabilityProgress = expansionProgress['robotability'] ?? (isSelectedRobotability ? 1 : 0);
      const robotabilityCollapsing = collapsingProjects.has('robotability');
      const bounds = projectBounds['robotability'] ?? robotabilityBounds;
      const centerLng = bounds ? (bounds.minLng + bounds.maxLng) / 2 : null;
      const centerLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : null;
      const maxRadius = bounds
        ? Math.max(
            1e-6,
            Math.hypot(
              (bounds.maxLng - bounds.minLng) / 2,
              (bounds.maxLat - bounds.minLat) / 2
            )
          )
        : 1;

      layerArray.push(
        new PolygonLayer<RobotabilityFeature>({
          id: 'robotability-polygon-layer',
          data: robotabilityFeatures,
          getPolygon: (feature) => feature.geometry.coordinates,
          stroked: false,
          filled: true,
          pickable: true,
          parameters: {
            depthTest: false,
          },
          getFillColor: (feature) => {
            const score = feature.properties?.score_percentile ?? 0;
            let alpha = isSelectedRobotability ? 255 : 200;
            const centroid = feature.properties?.centroid || null;

            if (bounds && centroid) {
              const [lng, lat] = centroid;
              const dLng = Math.max(bounds.minLng - lng, lng - bounds.maxLng, 0);
              const dLat = Math.max(bounds.minLat - lat, lat - bounds.maxLat, 0);
              const distanceFromBounds = Math.hypot(dLng, dLat);
              const inBounds = distanceFromBounds === 0;

              if (isSelectedRobotability || robotabilityCollapsing) {
                const normalization = Math.max(maxRadius * 15, 1e-6);
                const normalizedDistance = distanceFromBounds / normalization;

                if (normalizedDistance <= robotabilityProgress) {
                  alpha = 255;
                } else if (normalizedDistance <= robotabilityProgress + 0.35) {
                  const fade = smootherstep(
                    robotabilityProgress + 0.35,
                    robotabilityProgress,
                    normalizedDistance
                  );
                  alpha = Math.round(255 * fade);
                } else {
                  alpha = 0;
                }
              } else if (!inBounds) {
                alpha = 0;
              }
            } else if (!isSelectedRobotability && !robotabilityCollapsing) {
              // Without bounds, only show polygons when selected
              alpha = 0;
            }

            if (alpha <= 0) {
              return [0, 0, 0, 0];
            }

            return getRobotabilityColor(score, alpha);
          },
          updateTriggers: {
            getFillColor: [
              isSelectedRobotability,
              robotabilityProgress,
              robotabilityCollapsing,
              bounds?.minLng,
              bounds?.maxLng,
              bounds?.minLat,
              bounds?.maxLat,
            ],
          },
        })
      );
    }

    // Layer for projects with custom icons (drawn last to stay above other layers)
    if (projectsWithIcons.length > 0) {
      layerArray.push(
        new IconLayer({
          id: "project-markers-icons",
          data: projectsWithIcons,
          getPosition: (d: CollectionEntry<"projects">) => projectCoordsBySlug[d.slug] || [0, 0],
          getIcon: (d: CollectionEntry<"projects">) => ({
            url: d.data.icon!,
            width: 128,
            height: 128,
            anchorY: 128,
          }),
          getSize: 40,
          sizeMinPixels: 32,
          sizeMaxPixels: 48,
          pickable: true,
          onClick: (info: PickingInfo) => {
            if (info.object) {
              startTransition(() => {
                setSelectedProject(info.object as CollectionEntry<"projects">);
              });
            }
          },
          onHover: handleLayerHover,
          updateTriggers: {
            getIcon: [projectsWithIcons],
          },
        })
      );
    }

    return layerArray;
  }, [projects, projectsWithIcons, projectsWithoutIcons, selectedProject, loadedGeojson, expansionProgress, collapsingProjects, projectCoordsBySlug, projectBounds, startTransition, handleLayerHover, robotabilityFeatures]);

  // Recompute modal position at current centroid and viewport
  const recomputeModalPosition = useCallback(() => {
    if (!selectedProject) {
      setModalScreenPos(null);
      return;
    }
    const coords = projectCoordsBySlug[selectedProject.slug];
    if (!coords) {
      setModalScreenPos(null);
      return;
    }
    const map = mapRef.current?.getMap?.() ?? mapRef.current as any;
    if (!map || !wrapperRef.current) return;
    try {
      const point = map.project({ lng: coords[0], lat: coords[1] });
      // Use wrapper-relative coordinates for absolute positioning
      setModalScreenPos({ x: point.x, y: point.y });
    } catch {
      // ignore projection errors
    }
  }, [selectedProject, projectCoordsBySlug]);

  // rAF-throttled viewState change handler to reposition modal
  const handleViewStateChange = useCallback(() => {
    if (modalRafRef.current == null) {
      modalRafRef.current = requestAnimationFrame(() => {
        modalRafRef.current = null;
        recomputeModalPosition();
      });
    }
  }, [recomputeModalPosition]);

  // Recompute when selection changes or on resize
  useEffect(() => {
    recomputeModalPosition();
  }, [recomputeModalPosition]);

  useEffect(() => {
    const onResize = () => recomputeModalPosition();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [recomputeModalPosition]);
  
  // Load GeoArrow data for Robotability and prepare a GeoArrow layer
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      try {
        // Load Arrow IPC (Feather/Arrow file) to avoid Parquet browser codec issues
        const arrow = await import(/* @vite-ignore */ 'apache-arrow').catch(() => null as any);
        if (!arrow || !arrow.tableFromIPC) {
          console.warn('GeoArrow: apache-arrow not available; skipping robotability layer');
          return;
        }
        const resp = await fetch('/assets/layers/robotability.arrow');
        const buf = await resp.arrayBuffer();
        const table: any = arrow.tableFromIPC(new Uint8Array(buf));
        const fieldsInfo = table?.schema?.fields?.map((f: any) => ({
          name: f?.name,
          // Some builds expose extension on type, others on metadata
          typeExt: f?.type?.extensionName,
          metaExt: f?.metadata?.get?.('ARROW:extension:name')
        }));
        console.info('GeoArrow: loaded Arrow table', {
          numRows: table?.numRows,
          numBatches: table?.batches?.length,
          fields: fieldsInfo
        });

        const { features, bounds } = convertRobotabilityTable(table as any);
        if (!isCancelled) {
          setRobotabilityFeatures(features);
          if (bounds) {
            setRobotabilityBounds(bounds);
          }
        }
      } catch (e) {
        console.warn('GeoArrow: Failed loading robotability arrow layer', e);
      }
    })();
    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="project-map-wrapper" ref={wrapperRef}>
      {/* Project tile list sidebar */}
      <ProjectTileList
        projects={projects}
        onProjectClick={handleProjectClick}
        selectedProject={selectedProject}
      />

      {mapStyle && (
        <DeckGL
          initialViewState={INITIAL_VIEW_STATE}
          controller={true}
          layers={layers}
          // Limit device pixel ratio to reduce GPU overdraw on retina screens
          useDevicePixels={Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)}
          style={{ position: "relative", width: "100%", height: "100%" }}
          onViewStateChange={handleViewStateChange as any}
        >
          <Map
            mapStyle={mapStyle}
            // Disable redundant interactions (deck.gl controller handles pan/zoom)
            interactive={false}
            ref={mapRef as any}
            style={{ width: "100%", height: "100%" }}
          />
        </DeckGL>
      )}

      {/* Hover tooltip */}
      {hoverInfo && hoverInfo.object && (
        <div
          className="project-map-tooltip"
          style={{
            transform: `translate(${hoverInfo.x}px, ${hoverInfo.y}px) translate(-50%, -100%)`,
          }}
        >
          <div className="tooltip-title">{hoverInfo.object.data.title}</div>
          <div className="tooltip-venue">{hoverInfo.object.data.venue}</div>
        </div>
      )}

      {/* Legend */}
      <div className="project-map-legend">
        <div className="legend-item">
          <span 
            className="legend-dot" 
            style={{ backgroundColor: `rgb(${CATEGORY_COLORS["dense-street-imagery"].join(",")})` }}
          />
          <span className="legend-label">Dense Street Imagery</span>
        </div>
        <div className="legend-item">
          <span 
            className="legend-dot" 
            style={{ backgroundColor: `rgb(${CATEGORY_COLORS["tools-for-public-space"].join(",")})` }}
          />
          <span className="legend-label">Tools for Public Space</span>
        </div>
        <div className="legend-item">
          <span 
            className="legend-dot" 
            style={{ backgroundColor: `rgb(${CATEGORY_COLORS["computational-social-science"].join(",")})` }}
          />
          <span className="legend-label">Computational Social Science</span>
        </div>
      </div>

      {/* Project modal */}
      <ProjectModal
        project={selectedProject}
        isOpen={!!selectedProject}
        onClose={handleCloseModal}
        screenPosition={modalScreenPos || undefined}
      />
    </div>
  );
}

