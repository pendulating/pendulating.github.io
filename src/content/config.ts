import { SITE } from "@config";
import { defineCollection, z } from "astro:content";

const getBlogSchema = ({ image }: { image: (opt?: { inferSize: true }) => any }) =>
  z.object({
    author: z.string().default(SITE.author),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    title: z.string(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["others"]),
    ogImage: image()
      .refine((img: { width: number; height: number }) => img.width >= 1200 && img.height >= 630, {
        message: "OpenGraph image must be at least 1200 X 630 pixels!",
      })
      .or(z.string())
      .optional(),
    description: z.string(),
    canonicalURL: z.string().optional(),
    hero: z
      .object({
        type: z.enum(["map", "image", "iframe"]),
        src: z.string(),
        alt: z.string().optional(),
        height: z.number().default(400),
        center: z.string().optional(),
        zoom: z.number().optional(),
      })
      .optional(),
  });

const blog = defineCollection({
  schema: getBlogSchema,
});

const meBlog = defineCollection({
  schema: getBlogSchema,
});

const photos = defineCollection({
  schema: ({ image }) =>
    z.object({
      albumId: z.string(),
      title: z.string().optional(),
      photo: image(),
      caption: z.string().optional(),
      pubDatetime: z.string().or(z.date()).default(() => new Date().toISOString()),
      order: z.number().optional(),
      metadata: z.object({
        camera: z.string().optional(),
        lens: z.string().optional(),
        location: z.string().optional(),
        settings: z.object({
          aperture: z.string().optional(),
          shutterSpeed: z.string().optional(),
          iso: z.union([z.string(), z.number()]).optional(),
          focalLength: z.string().optional(),
        }).optional(),
      }).optional(),
    }),
});

const mePhotos = defineCollection({
  schema: ({ image }) =>
    z.object({
      albumId: z.string(),
      title: z.string().optional(),
      photo: image(),
      caption: z.string().optional(),
      pubDatetime: z.string().or(z.date()).default(() => new Date().toISOString()),
      order: z.number().optional(),
      metadata: z
        .object({
          camera: z.string().optional(),
          lens: z.string().optional(),
          location: z.string().optional(),
          settings: z
            .object({
              aperture: z.string().optional(),
              shutterSpeed: z.string().optional(),
              iso: z.union([z.string(), z.number()]).optional(),
              focalLength: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    }),
});

const albums = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    borderColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: "Border color must be a valid hex color code",
    }).default("#ffffff"),
    location: z.string().optional(),
    coverPhotoId: z.string().optional(),
  }),
});

const meAlbums = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    borderColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: "Border color must be a valid hex color code",
    }).default("#ffffff"),
    location: z.string().optional(),
    coverPhotoId: z.string().optional(),
  }),
});

const snips = defineCollection({
  schema: z.object({
    albumId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    order: z.number().optional(),
  }),
});

const meSnips = defineCollection({
  schema: z.object({
    albumId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    modDatetime: z.date().optional().nullable(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    source: z.string().optional(),
    sourceUrl: z.string().url().optional(),
    order: z.number().optional(),
  }),
});

const playlists = defineCollection({
  schema: z.object({
    albumId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    platform: z.enum(["spotify", "apple"]),
    playlistUrl: z.string().url(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    coverImage: z.string().optional(),
    mood: z.array(z.string()).optional(),
    order: z.number().optional(),
  }),
});

const mePlaylists = defineCollection({
  schema: z.object({
    albumId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    pubDatetime: z.date(),
    platform: z.enum(["spotify", "apple"]),
    playlistUrl: z.string().url(),
    featured: z.boolean().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).default(["untagged"]),
    coverImage: z.string().optional(),
    mood: z.array(z.string()).optional(),
    order: z.number().optional(),
  }),
});

const projects = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      venue: z.string(),
      href: z.string().url().optional(), // Main project link
      tag: z.string().optional(),
      pdf: z.string().url().optional(), // PDF link
      site: z.string().url().optional(), // Website link
      code: z.string().url().optional(), // Code repository link
      bib: z.string().optional(), // BibTeX citation text
      category: z
        .enum([
          "dense-street-imagery",
          "computational-social-science",
          "tools-for-public-space",
        ])
        .default("dense-street-imagery"), // Category field
      image: image().or(z.string()).optional(),
      youtubeId: z.string().optional(),
      pubDatetime: z.date(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      description: z.string().optional(),
      order: z.number().optional(),
      coordinates: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }).optional(), // Project location on map (fallback)
      geojson: z.any().optional(), // Full citywide GeoJSON layer for this project (inline)
      geojsonUrl: z.string().optional(), // URL to fetch GeoJSON from
      boundingPolygon: z.any().optional(), // Bounding polygon to crop the geojson when not selected
      icon: z.string().optional(), // Custom icon URL/path for map marker
    }),
});

const meProjects = defineCollection({
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      venue: z.string(),
      href: z.string().url().optional(),
      tag: z.string().optional(),
      pdf: z.string().url().optional(),
      site: z.string().url().optional(),
      code: z.string().url().optional(),
      bib: z.string().optional(),
      category: z
        .enum([
          "dense-street-imagery",
          "computational-social-science",
          "tools-for-public-space",
        ])
        .default("dense-street-imagery"),
      image: image().or(z.string()).optional(),
      youtubeId: z.string().optional(),
      pubDatetime: z.date(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      description: z.string().optional(),
      order: z.number().optional(),
      coordinates: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      geojson: z.any().optional(),
      geojsonUrl: z.string().optional(),
      boundingPolygon: z.any().optional(),
      icon: z.string().optional(),
    }),
});

const news = defineCollection({
  schema: z.object({
    date: z.date(),
    news: z.string(),
    link: z.string().url().optional(),
  }),
});

export const collections = {
  blog,
  meBlog,
  albums,
  meAlbums,
  photos,
  mePhotos,
  snips,
  meSnips,
  playlists,
  mePlaylists,
  projects,
  meProjects,
  news,
};