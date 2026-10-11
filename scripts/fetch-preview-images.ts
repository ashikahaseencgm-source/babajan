/**
 * Downloads PREVIEW photography (Unsplash License) listed in
 * scripts/preview-images.json into public/images/preview/ and writes
 * public/images/preview/CREDITS.md. These are stand-ins for demonstration;
 * replace them with photographs of the boutique's actual pieces before launch.
 *
 *   npx tsx scripts/fetch-preview-images.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";

type Item = { name: string; id: string; user: string; username: string; raw: string };
const items: Item[] = JSON.parse(readFileSync("scripts/preview-images.json", "utf8"));
const OUT = "public/images/preview";

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const it of items) {
    const url = `${it.raw}&w=1600&fm=jpg&q=82&fit=max`;
    if (!url.startsWith("https://images.unsplash.com/")) throw new Error(`Unexpected host for ${it.name}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`${it.name}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Re-encode (validates it's an image, strips metadata).
    const info = await sharp(buf).rotate().jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${it.name}.jpg`);
    console.log(`${it.name}.jpg  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`);
  }
  const credits = [
    "# Preview photography credits",
    "",
    "Stand-in imagery for demonstration only, used under the Unsplash License (https://unsplash.com/license).",
    "These photographs do not show Babajan Sumangali products. Replace before launch.",
    "",
    ...items.map((it) => `- \`${it.name}.jpg\` — Photo by ${it.user} (https://unsplash.com/@${it.username}) on Unsplash — https://unsplash.com/photos/${it.id}`),
    "",
  ].join("\n");
  writeFileSync(`${OUT}/CREDITS.md`, credits);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
