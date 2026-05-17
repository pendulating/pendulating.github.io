# Satellites: adding hover-reveal annotations

Satellites are small floating cards (image, logo, or text) that bloom from
a word or phrase in body text, connected by a hand-drawn curve. They are
rendered by the `HoverReveal` component.

## Quick example

```astro
---
import HoverReveal from "@components/HoverReveal.astro";
---

<p>
  I work at
  <HoverReveal
    id="cornell-tech"
    variant="image"
    src="/assets/cornell-tech.jpg"
    alt="Cornell Tech campus on Roosevelt Island"
    label="Cornell Tech campus"
    size="lg"
    shape="rect"
    placement="top-right"
    curve="arc-right"
    distance="normal"
  >Cornell Tech</HoverReveal>, on Roosevelt Island.
</p>
```

The word between the tags is the **anchor** — it gets the dotted accent
underline. On hover/focus, the tether draws itself and the card pops in.

## Props reference

| prop | type | default | notes |
|---|---|---|---|
| `id` | string | — | Required for accessibility. Used for `aria-describedby`. |
| `variant` | `"image" \| "logo" \| "text"` | `"image"` | Card content type |
| `src` | string | — | Image path (for `image` / `logo`). Put the file in `public/assets/`. |
| `alt` | string | `""` | Image alt text |
| `text` | string | — | For `variant="text"` |
| `href` | string | — | Makes the card clickable. If set, card becomes an `<a>`. |
| `external` | boolean | `false` | Opens `href` in new tab |
| `label` | string | — | Accessible label for the card |
| `size` | `"sm" \| "md" \| "lg"` | `"sm"` | Base card size (88 / 116 / 148 px) |
| `shape` | `"circle" \| "rect" \| "portrait"` | `"circle"` | `rect` = 1.5:1 landscape, `portrait` ≈ 1:1.5 book-cover |
| `placement` | `"top-right" \| "top-left" \| "bottom-right" \| "bottom-left"` | `"top-right"` | Which corner the card floats toward |
| `curve` | `"natural" \| "arc-right" \| "arc-left" \| "taut" \| "loop"` | `"natural"` | Shape of the tether line |
| `distance` | `"short" \| "normal" \| "long" \| "xlong"` | `"normal"` | Multiplies tether length (0.7× / 1× / 1.6× / 2.2×) |

## Choosing placement

Pick the placement based on where the word sits in the paragraph:

- Words near the **left margin** → `top-right` or `bottom-right` (card opens into the text, not off-screen)
- Words near the **right margin** → `top-left` or `bottom-left`
- Words on the **first line** → prefer `bottom-*` so the card doesn't collide with the header
- Words on the **last line** → prefer `top-*`

## Choosing a curve

- `natural` — default. A gentle quadratic bow, good for most cases.
- `taut` — almost straight. Use when space is tight or the vibe is restrained.
- `arc-right` — swoops rightward past the card, then curves back left. Dramatic.
- `arc-left` — mirrored swoop.
- `loop` — playful S-crossing curve. Use sparingly — it's loud.

`arc-right` on a `top-right` placement means "the curve bulges out to the
right before reaching the card." `arc-left` on the same placement means
"the curve bulges to the left before reaching the card." Direction is
absolute (screen-space), not relative to the placement.

## Choosing distance

`distance` scales how far the card floats from the anchor word:

- `short` (0.7×) — the card hugs the word
- `normal` (1×) — default
- `long` (1.6×) — the card floats well off
- `xlong` (2.2×) — the card is clearly in the margin

Longer distances combine well with `arc-*` curves (the curve has more room
to express itself).

## Adding a new image

1. Drop the image in `public/assets/`. Use a descriptive filename: `venue-name.jpg`, `person-portrait.png`, etc.
2. Optimize the file — circle-cropped portraits work well around 400×400; landscape photos around 800×534 (3:2).
3. Reference it as `src="/assets/your-file.jpg"`.
4. Give each satellite a unique `id` (kebab-case).
5. Always supply `alt` and `label` for accessibility.

## Accessibility

- The anchor word is keyboard-focusable (`tabindex="0"`) and opens the card on `:focus-within`.
- `aria-describedby` links the word to the card's id.
- On touch/coarse-pointer devices the card opens on tap (`.is-tapped`, 3 s auto-close) and is **scaled down but still shown** ≤640px — it is not hidden.
- `prefers-reduced-motion` suppresses the spring animation but keeps the opacity fade.

## Placement is automatic & header-safe

The authored `placement` / `distance` / `curve` are only a *preference*. At
open time the component's script (`resolve()` in `HoverReveal.astro`)
recomputes the card position against a **safe region** whose top edge is the
live `#main-header` box (`safeInsets()`), so a card can never be drawn behind
the fixed header or off any viewport edge.

- On **coarse-pointer** devices it always uses the deterministic path: the
  card + tether switch to `position: fixed` in viewport coordinates and the
  tether re-attaches to the anchor word's nearest line fragment — so a
  wrapped inline word can't throw the geometry off. Scrolling while open
  dismisses the card (it can't drift, being fixed).
- On **fine-pointer** devices, if the authored placement fits the safe
  region it's used verbatim (the curve presets below still apply); otherwise
  the same constrained path runs.

Practical effect: choosing `placement`/`distance` well still gives the nicest
*default* curve on desktop, but you no longer need to hand-tune them to avoid
the header or small screens — that's handled.

## Examples to crib from

See `src/pages/index.astro` hero paragraph:
- **I** — circular self-portrait, `sm` / `circle` / `top-right` / `natural` / `xlong`
- **Cornell Tech** — rectangular campus photo, `lg` / `rect` / `top-right` / `arc-right` / `normal`
- **non-fiction** — book cover, `md` / `portrait` / `top-right` / `natural` / `normal`

## Where the pieces live

- Component: `src/components/HoverReveal.astro`
- Styles: `src/styles/base.css` (search for `/* ===== Hover Reveal (Marginalia) ===== */`)
- Tether paths: defined inline in the component (`tetherPaths` object)
- Size + distance tokens: defined inline in the component (`sizeTokens`, `distTokens`)

## Gotchas

- **Don't use a `<div>` inside inline text.** The card has to be a `<span>` or `<a>` — the component handles this. If you extend the component, don't swap in block elements.
- **Card custom properties must be inline styles.** The CSS minifier strips rules that only declare custom properties, which is why `--reveal-size` / `--reveal-dist` are set via the `style` attribute rather than class-based overrides.
- **SVG has `overflow: visible`** so `arc-*` and `loop` curves can swoop outside the tether's bounding box.
