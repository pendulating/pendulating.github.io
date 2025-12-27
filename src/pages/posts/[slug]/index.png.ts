import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { generateOgImageForPost } from "@utils/generateOgImages";
import { slugifyStr } from "@utils/slugify";
import { SITE } from "@config";

export async function getStaticPaths() {
  if (SITE.dynamicOgImage === false) return [];
  const posts = await getCollection("blog").then(p =>
    p.filter(({ data }) => !data.draft && !data.ogImage)
  );

  return posts.map(post => ({
    params: { slug: slugifyStr(post.data.title) },
    props: post,
  }));
}

export const GET: APIRoute = async ({ props }) => {
  if (SITE.dynamicOgImage === false) return new Response(null, { status: 404 });
  return new Response(await generateOgImageForPost(props as CollectionEntry<"blog">), {
    headers: { "Content-Type": "image/png" },
  });
};
