import type { APIRoute } from "astro";
import { getCollection, type CollectionEntry } from "astro:content";
import { generateOgImageForPost, generateStoryImageForPost } from "@utils/generateOgImages";

export async function getStaticPaths() {
  const posts = await getCollection("blog");
  
  return posts.map((post: CollectionEntry<"blog">) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { slug } = params;
    
    if (!slug) {
      return new Response("Slug parameter is required", { status: 400 });
    }

    const posts = await getCollection("blog");
    const post = posts.find((p: CollectionEntry<"blog">) => p.slug === slug);

    if (!post) {
      return new Response("Post not found", { status: 404 });
    }

    const url = new URL(request.url);
    const variant = url.searchParams.get("variant");

    const pngBuffer = variant === "story"
      ? await generateStoryImageForPost(post as CollectionEntry<"blog">)
      : await generateOgImageForPost(post as CollectionEntry<"blog">);

    return new Response(pngBuffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error generating OG image:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}; 