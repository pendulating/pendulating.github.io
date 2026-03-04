import { slugifyAll } from "./slugify";
import type { PostEntry } from "../types/content";

const MUSIC_TAG_SLUGS = new Set(["music", "sheet-music"]);
const PERSONAL_POST_SLUGS = new Set(["where-i-am-from"]);

export const isMusicRelatedPost = (post: PostEntry) =>
  PERSONAL_POST_SLUGS.has(post.slug) ||
  slugifyAll(post.data.tags).some(tag => MUSIC_TAG_SLUGS.has(tag));

export const isAcademicPost = (post: PostEntry) => !isMusicRelatedPost(post);

export const mergePostsBySlug = (...groups: PostEntry[][]) => {
  const seen = new Set<string>();
  const merged: PostEntry[] = [];
  for (const group of groups) {
    for (const post of group) {
      if (seen.has(post.slug)) continue;
      seen.add(post.slug);
      merged.push(post);
    }
  }
  return merged;
};
