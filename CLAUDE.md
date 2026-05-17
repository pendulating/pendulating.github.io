# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Matt Franchi's personal + academic website (https://mfranchi.net), built on the AstroPaper
theme. Astro 4 + React islands + Tailwind, statically built and deployed to GitHub Pages.

## Commands

The package manager is **pnpm** (CI and `withastro/action` use it; there is a `pnpm-lock.yaml`).

- `pnpm dev` — local dev server (default port 4321)
- `pnpm build` — production build to `dist/` (runs `astro check` then `astro build`)
- `pnpm preview` — serve the built `dist/`
- `pnpm lint` — ESLint over the repo
- `pnpm format` / `pnpm format:check` — Prettier (with astro + tailwind plugins)
- `pnpm test` — Jest (ts-jest, ESM). `pnpm test:watch`, `pnpm test:coverage`
- `pnpm test:schema` — runs only `src/utils/__tests__/schemaValidation.test.ts`
- Run a single test: `pnpm jest path/to/file.test.ts` or `pnpm jest -t "test name"`

Jest mocks `astro:content` via `src/utils/__mocks__/astroContent.js`, so content-collection
schemas can be unit-tested without the Astro runtime.

Deployment is automatic: any push to `main` triggers `.github/workflows/deploy.yml`.

## Architecture

### The "flair" dual-persona system

The site presents two parallel personas sharing one codebase:

- **academic** — root path `/`
- **me** — path `/me` (personal/music side)

`src/flair/config.ts` (`FLAIRS`) maps each flair to its own set of content collections:
`blog`/`meBlog`, `projects`/`meProjects`, `albums`/`meAlbums`, `snips`/`meSnips`,
`playlists`/`mePlaylists`. Pages under `src/pages/me/**` mirror the root pages but select
`FLAIRS.me`. Use `toFlairPath(basePath, route)` to build flair-correct links and pass
`basePath="/me"` to shared components like `Header`.

`src/utils/flairPostSplit.ts` is the exception to the strict collection split: posts in the
`blog` collection tagged music/sheet-music (or in `PERSONAL_POST_SLUGS`) are filtered *out*
of the academic home and merged *into* `/me`. When changing what appears on either home
page, check `isAcademicPost` / `isMusicRelatedPost` / `mergePostsBySlug`.

### Content collections

All collections and Zod schemas live in `src/content/config.ts` (Astro
`experimental.contentLayer` is on). Notable: the `projects`/`meProjects` schema carries
optional geospatial fields (`coordinates`, `geojson`, `geojsonUrl`, `boundingPolygon`) that
drive the interactive project map. Photo/album collections use Astro's `image()` for typed
local image assets. Edit schemas here and adjust `schemaValidation.test.ts` together.

### Issue-driven content automation

`.github/workflows/issues-to-content.yml` converts GitHub issues into content. Adding a
`snip`, `playlist`, or `album` label parses the issue body (section headers like `### Content`,
`### Tags (optional)`), downloads any attached images for albums, writes Markdown into
`src/content/<type>/`, commits to `main`, and dispatches the deploy workflow. Keep that
parser in sync with the issue-template field names and the collection schemas.

### Admin interface

`/admin` (`src/pages/admin/index.astro` + `src/components/admin/*`) is a client-side React
app for authoring content. It authenticates with an encrypted GitHub token
(`cryptoUtil.ts`, `public/data/encryptedSettings.json`) and writes content via the GitHub
API (`githubService.ts` / `githubDirectService.ts`). It is fully client-side — there is no
backend server.

### Interactive maps

Project pages render maps with deck.gl + maplibre-gl (`ProjectMapView.tsx`,
`DeckGLArcMap.tsx`, plus React-wrapper components). Large geo datasets are loaded as
Parquet/GeoArrow via `@loaders.gl` and `@geoarrow/deck.gl-layers`;
`src/utils/convertRobotabilityGeoarrow.ts`, `geojsonCentroid.ts`, and `geojsonCrop.ts`
support this. The `claustrophobic-streets` post is the main consumer.

### Other notable pieces

- **brain** (`/brain`, `BrainPage.tsx`, `Whiteboard.tsx`, `src/styles/whiteboard.css`) — a
  whiteboard/canvas view of albums, snips, and playlists.
- **OG images** — generated at build via satori + `@resvg/resvg-js`
  (`src/utils/generateOgImages.tsx`, `og-templates/`, routes under `src/pages/og/`).
  `@resvg/resvg-js` is excluded from Vite `optimizeDeps`.
- **Social sharing** — see `SOCIAL_SHARING.md`; `ShareLinks.astro`,
  `InstagramStoryShare.astro`, `socialSharing.ts`.
- **HoverReveal / satellites** — floating annotation cards tethered to body text; see
  `wiki/hover-reveal-satellites.md` before touching `HoverReveal.astro`.

## Conventions

- Import via path aliases, not relative paths: `@config`, `@components/*`, `@layouts/*`,
  `@utils/*`, `@content/*`, `@flair/*`, `@assets/*`, `@styles/*` (see `tsconfig.json`).
- TypeScript is `astro/tsconfigs/strict`.
- `src/config.ts` holds site-wide settings (`SITE`, `SOCIALS`, `PROFILE`, `LOCALE`).
- `old/` is dead/legacy code (not built). `dist/` is build output. `wiki/` is internal docs.
- When adding a content type or page, create both the academic and `/me` variant unless it
  is intentionally single-persona.
