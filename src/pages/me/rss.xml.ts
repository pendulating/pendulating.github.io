import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import getSortedPosts from "@utils/getSortedPosts";
import { isMusicRelatedPost, mergePostsBySlug } from "@utils/flairPostSplit";
import { SITE } from "@config";

export async function GET() {
  const posts = mergePostsBySlug(
    await getCollection("meBlog"),
    (await getCollection("blog")).filter(isMusicRelatedPost)
  );
  const sortedPosts = getSortedPosts(posts);
  return rss({
    title: `${SITE.title} (Me)`,
    description: SITE.desc,
    site: SITE.website,
    items: sortedPosts.map(({ data, slug }) => ({
      link: `me/posts/${slug}/`,
      title: data.title,
      description: data.description,
      pubDate: new Date(data.modDatetime ?? data.pubDatetime),
    })),
  });
}
