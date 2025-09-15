import satori from "satori";
import type { CollectionEntry } from "astro:content";
import { SITE } from "@config";
import loadLocalFonts, { type FontOptions } from "../loadLocalFonts";

// 1080x1920 story image generator
export default async (post: CollectionEntry<"blog">) => {
  return satori(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        overflow: "hidden",
      }}
    >
      {/* subtle gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 15% 20%, rgba(59,130,246,0.3) 0%, transparent 45%), radial-gradient(circle at 85% 80%, rgba(236,72,153,0.3) 0%, transparent 45%)",
        }}
      />

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
        {/* Top label */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            {SITE.title}
          </div>
          <div
            style={{
              fontSize: 28,
              color: "#475569",
            }}
          >
            {new URL(SITE.website).hostname}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              display: "-webkit-box",
              WebkitLineClamp: 5,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              letterSpacing: -0.5,
            }}
          >
            {post.data.title}
          </h1>
        </div>

        {/* Excerpt */}
        {(post.data.description || post.body) && (
          <div
            style={{
              marginTop: 12,
              padding: "0 48px",
              textAlign: "center",
              color: "#334155",
              fontFamily: 'GTZirkon',
              fontSize: 36,
              lineHeight: 1.35,
              maxHeight: 320,
              display: "-webkit-box",
              WebkitLineClamp: 6,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {(post.data.description || String(post.body || '')).replace(/<[^>]+>/g, '').slice(0, 400)}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #e2e8f0",
            paddingTop: 28,
          }}
        >
          <div>
            <div style={{ fontFamily: 'GTZirkon', fontSize: 28, color: "#64748b" }}>by</div>
            <div style={{ fontFamily: 'GTZirkon', fontSize: 40, fontWeight: 700, color: "#0f172a" }}>
              {post.data.author}
            </div>
          </div>
          {post.data.tags && post.data.tags.length > 0 && (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {post.data.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
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
                </span>
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
      fonts: (await loadLocalFonts()) as FontOptions[],
    }
  );
};


