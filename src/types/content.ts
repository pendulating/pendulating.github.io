import type { CollectionEntry } from "astro:content";
import type { BlogCollectionName } from "../flair/config";

export type PostEntry = CollectionEntry<BlogCollectionName>;
export type PostData = PostEntry["data"];

export interface TagInfo {
  tag: string;
  tagName: string;
}
