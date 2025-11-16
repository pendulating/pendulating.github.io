import type { CollectionEntry } from "astro:content";

export interface ProjectLocation {
  id: string;
  title: string;
  coordinates: [number, number]; // [lng, lat]
  category: string;
  projectData: CollectionEntry<"projects">;
}

export interface ProjectMarker {
  position: [number, number];
  project: CollectionEntry<"projects">;
}

