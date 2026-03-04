import { defineConfig, sharpImageService } from "astro/config";
import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
import partytown from "@astrojs/partytown";

// https://astro.build/config
export default defineConfig({
  site: "https://mfranchi.net",
  redirects: {
     '/claustrophobic-streets': '/posts/claustrophobic-streets'
  },
  integrations: [
    tailwind({
      applyBaseStyles: false,
    }),
    react(),
    sitemap(),
    partytown({
      config: {
        forward: ['dataLayer.push'],
      },
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      wrap: true,
    },
  },
  vite: {
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    // Add environment variable handling
    envPrefix: ['VITE_'],
    server: {
      watch: {
        // Don't reload on .env changes to prevent cyclic restarts
        ignored: ['**/.env*']
      }
    }
  },
  scopedStyleStrategy: "where",
  experimental: {
    contentLayer: true,
  },
  image: {
    service: sharpImageService()
  },
});
