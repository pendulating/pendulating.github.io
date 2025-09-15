import { readFile } from "fs/promises";
import type { FontStyle, FontWeight } from "satori";

export type FontOptions = {
  name: string;
  data: ArrayBuffer;
  weight: FontWeight | undefined;
  style: FontStyle | undefined;
};

export default async function loadLocalFonts(): Promise<FontOptions[]> {
  // Prefer local TTFs to avoid glyph issues; GT Zirkon is available as TTF
  const regularPath = new URL("../../public/fonts/GTZirkon-Regular.ttf", import.meta.url);
  const boldPath = new URL("../../public/fonts/GTZirkon-Bold.ttf", import.meta.url);

  const [regular, bold] = await Promise.all([
    readFile(regularPath),
    readFile(boldPath),
  ]);

  return [
    {
      name: "GTZirkon",
      data: regular.buffer as ArrayBuffer,
      weight: 400,
      style: "normal",
    },
    {
      name: "GTZirkon",
      data: bold.buffer as ArrayBuffer,
      weight: 700,
      style: "normal",
    },
  ];
}


