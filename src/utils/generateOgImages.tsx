import { Resvg } from "@resvg/resvg-js";
import { type CollectionEntry } from "astro:content";
import postOgImage from "./og-templates/post";
import siteOgImage from "./og-templates/site";
import storyOgImage from "./og-templates/story";

function svgBufferToPngBuffer(svg: string): Uint8Array {
  const resvg = new Resvg(svg);
  const pngData = resvg.render();
  return pngData.asPng();
}

export async function generateOgImageForPost(post: CollectionEntry<"blog">): Promise<Uint8Array> {
  const svg = await postOgImage(post);
  return svgBufferToPngBuffer(svg);
}

export async function generateOgImageForSite(): Promise<Uint8Array> {
  const svg = await siteOgImage();
  return svgBufferToPngBuffer(svg);
}

export async function generateStoryImageForPost(post: CollectionEntry<"blog">): Promise<Uint8Array> {
  const svg = await storyOgImage(post);
  return svgBufferToPngBuffer(svg);
}
