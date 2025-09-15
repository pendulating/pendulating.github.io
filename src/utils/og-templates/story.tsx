import satori from "satori";
import type { CollectionEntry } from "astro:content";
import { SITE } from "@config";
import loadLocalFonts, { type FontOptions } from "../loadLocalFonts";
import loadGoogleFonts from "../loadGoogleFont";

// 1080x1920 story image generator
export default async (post: CollectionEntry<"blog">) => {
  // Resolve fonts with local-first, then Google fallback to avoid 500s
  let fonts: FontOptions[];
  try {
    fonts = (await loadLocalFonts()) as FontOptions[];
  } catch (e) {
    console.error("Local font load failed, falling back to Google fonts:", e);
    fonts = (await loadGoogleFonts(
      post.data.title + (post.data.description || "") + (post.data.author || "") + SITE.title
    )) as unknown as FontOptions[];
  }

  // Dynamic gradient colors derived from slug/title
  const seed = (post.slug || post.data.title || SITE.title || "").toString();
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const hue1 = hash % 360;
  const hue2 = (hash * 7) % 360;
  // Use hex/rgba to avoid CSS function parsing issues in Satori
  function hslToRgb(h: number, s: number, l: number) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rP = 0, gP = 0, bP = 0;
    if (0 <= h && h < 60) { rP = c; gP = x; bP = 0; }
    else if (60 <= h && h < 120) { rP = x; gP = c; bP = 0; }
    else if (120 <= h && h < 180) { rP = 0; gP = c; bP = x; }
    else if (180 <= h && h < 240) { rP = 0; gP = x; bP = c; }
    else if (240 <= h && h < 300) { rP = x; gP = 0; bP = c; }
    else { rP = c; gP = 0; bP = x; }
    const r = Math.round((rP + m) * 255);
    const g = Math.round((gP + m) * 255);
    const b = Math.round((bP + m) * 255);
    return { r, g, b };
  }
  function toHex(v: number) { return v.toString(16).padStart(2, '0'); }
  const startRgb = hslToRgb(hue1, 0.70, 0.18);
  const endRgb = hslToRgb(hue2, 0.80, 0.22);
  const gradStartHex = `#${toHex(startRgb.r)}${toHex(startRgb.g)}${toHex(startRgb.b)}`;
  const gradEndHex = `#${toHex(endRgb.r)}${toHex(endRgb.g)}${toHex(endRgb.b)}`;
  const overlayA = 0.26, overlayB = 0.24;
  const overlay1 = `rgba(${startRgb.r}, ${startRgb.g}, ${startRgb.b}, ${overlayA})`;
  const overlay2 = `rgba(${endRgb.r}, ${endRgb.g}, ${endRgb.b}, ${overlayB})`;

  // Prepare markdown text: description (as paragraph) + raw body
  const mdTextFull = ((post.data.description ? post.data.description + "\n\n" : "") + (post.body || "")).trim();
  // Remove any <iframe> blocks entirely (multi-line safe), then bound length
  const mdNoIframes = mdTextFull
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<iframe[^>]*\/>/gi, '');
  // Avoid Resvg panics by bounding text length
  const mdText = mdNoIframes.length > 1400 ? mdNoIframes.slice(0, 1396) + '…' : mdNoIframes;

  // Very minimal markdown-to-blocks (no inline arrays, no nested arrays)
  function stripInline(md: string) {
    return md
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1');
  }

  function renderMarkdown(md: string) {
    const lines = md.split(/\n/);
    const blocks: any[] = [];
    let para: string[] = [];

    function flushPara() {
      if (!para.length) return;
      const text = stripInline(para.join(' ').trim());
      if (text) {
        blocks.push(
          <div key={`p-${blocks.length}`} style={{ display: 'flex', fontFamily: 'GTZirkon', fontSize: 36, lineHeight: 1.5, color: '#334155' }}>
            {text}
          </div>
        );
      }
      para = [];
    }

    let listBuffer: string[] = [];
    function flushList() {
      if (!listBuffer.length) return;
      blocks.push(
        <div key={`ul-${blocks.length}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listBuffer.map((t, i) => (
            <div key={`li-${blocks.length}-${i}`} style={{ display: 'flex', flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 18, textAlign: 'center', color: '#0f172a' }}>•</div>
              <div style={{ fontFamily: 'GTZirkon', fontSize: 34, lineHeight: 1.4, color: '#334155' }}>{stripInline(t)}</div>
            </div>
          ))}
        </div>
      );
      listBuffer = [];
    }

    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed) { flushList(); flushPara(); continue; }
      let m: RegExpExecArray | null;
      if ((m = /^#{3}\s+(.+)$/.exec(trimmed))) { flushList(); flushPara(); blocks.push(
        <div key={`h3-${blocks.length}`} style={{ display: 'flex', fontFamily: 'GTZirkon', fontWeight: 700, fontSize: 44, lineHeight: 1.2, color: '#0f172a', marginTop: 10 }}>{stripInline(m[1])}</div>
      ); continue; }
      if ((m = /^#{2}\s+(.+)$/.exec(trimmed))) { flushList(); flushPara(); blocks.push(
        <div key={`h2-${blocks.length}`} style={{ display: 'flex', fontFamily: 'GTZirkon', fontWeight: 700, fontSize: 56, lineHeight: 1.2, color: '#0f172a', marginTop: 12 }}>{stripInline(m[1])}</div>
      ); continue; }
      if ((m = /^#\s+(.+)$/.exec(trimmed))) { flushList(); flushPara(); blocks.push(
        <div key={`h1-${blocks.length}`} style={{ display: 'flex', fontFamily: 'GTZirkon', fontWeight: 700, fontSize: 72, lineHeight: 1.15, color: '#0f172a', marginTop: 14 }}>{stripInline(m[1])}</div>
      ); continue; }
      if (/^[-*]\s+/.test(trimmed)) { listBuffer.push(trimmed.replace(/^[-*]\s+/, '')); continue; }
      para.push(trimmed);
    }
    flushList(); flushPara();
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
        {blocks}
      </div>
    );
  }

  return satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        backgroundColor: gradStartHex,
        overflow: "hidden",
      }}
    >
      {/* background overlays removed for Satori stability */}

      {/* Card */}
      <div
        style={{
          width: 940,
          height: 1600,
          background: "rgba(255, 255, 255, 0.96)",
          borderRadius: 32,
          padding: 48,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          boxShadow: "0 30px 60px rgba(0,0,0,0.25)",
        }}
      >
        {/* Title */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 8,
            padding: "0 48px",
          }}
        >
          <h1
            style={{
              fontFamily: 'GTZirkon',
              fontSize: 92,
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.08,
              textAlign: "center",
              margin: 0,
              overflow: "hidden",
              letterSpacing: -0.5,
            }}
          >
            {post.data.title}
          </h1>
        </div>

        {/* Body text fills remaining space until footer */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginTop: 18, padding: "0 48px", overflow: 'hidden' }}>
          {renderMarkdown(mdText)}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            borderTop: "2px solid #e2e8f0",
            paddingTop: 28,
          }}
        >
          {post.data.tags && post.data.tags.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
              }}
            >
              {post.data.tags.slice(0, 3).map((tag) => (
                <div
                  key={tag}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#0f172a",
                    color: "#fff",
                    padding: "8px 18px",
                    borderRadius: 999,
                    fontFamily: 'GTZirkon',
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  #{tag}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    {
      width: 1080,
      height: 1920,
      embedFont: true,
      fonts,
    }
  );
};


