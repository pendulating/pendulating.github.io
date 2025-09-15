import { readFile } from "fs/promises";
import path from "node:path";
import type { FontStyle, FontWeight } from "satori";

export type FontOptions = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight | undefined;
  style: FontStyle | undefined;
};

export default async function loadLocalFonts(): Promise<FontOptions[]> {
  // Prefer project-root absolute paths; fall back to file-relative URL paths
  const primaryRegular = path.join(process.cwd(), "public", "fonts", "GTZirkon-Regular.ttf");
  const primaryBold = path.join(process.cwd(), "public", "fonts", "GTZirkon-Bold.ttf");
  const fallbackRegular = new URL("../../public/fonts/GTZirkon-Regular.ttf", import.meta.url).pathname;
  const fallbackBold = new URL("../../public/fonts/GTZirkon-Bold.ttf", import.meta.url).pathname;

  async function safeRead(p1: string, p2: string) {
    try {
      return await readFile(p1);
    } catch (e1) {
      try {
        return await readFile(p2);
      } catch (e2) {
        console.error("Failed to read font:", { primary: p1, fallback: p2, e1, e2 });
        throw e2;
      }
    }
  }

  const [regularBuf, boldBuf] = await Promise.all([
    safeRead(primaryRegular, fallbackRegular),
    safeRead(primaryBold, fallbackBold),
  ]);

  // Convert Node Buffers to exact ArrayBuffers (respect byteOffset/length)
  const regularAB = regularBuf.buffer.slice(regularBuf.byteOffset, regularBuf.byteOffset + regularBuf.byteLength);
  const boldAB = boldBuf.buffer.slice(boldBuf.byteOffset, boldBuf.byteOffset + boldBuf.byteLength);

  return [
    {
      name: "GTZirkon",
      data: regularAB,
      weight: 400,
      style: "normal",
    },
    {
      name: "GTZirkon",
      data: boldAB,
      weight: 700,
      style: "normal",
    },
  ];
}


