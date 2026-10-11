/**
 * Generates web-optimised derivatives of the APPROVED logo artwork in
 * `assets/`. Only lossless operations are applied: trimming fully
 * transparent padding and proportional resizing. Letterforms, colours and
 * proportions are never altered.
 *
 *   npm run brand:assets
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC_WORDMARK = "assets/name_logo.png";
const SRC_EMBLEM = "assets/standalone_logo.png";
const OUT = "public/brand";

async function main() {
  mkdirSync(OUT, { recursive: true });
  mkdirSync("src/app", { recursive: true });

  // Wordmark: trim transparent margin, then export at 2x of the largest render width.
  const wordmark = sharp(SRC_WORDMARK).trim({ threshold: 1 });
  const wm = await wordmark.clone().png().toBuffer({ resolveWithObject: true });
  console.log("wordmark trimmed to", wm.info.width, "x", wm.info.height);
  for (const width of [480, 960]) {
    await sharp(wm.data).resize({ width }).png({ compressionLevel: 9, palette: false }).toFile(`${OUT}/wordmark-${width}.png`);
    await sharp(wm.data).resize({ width }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/wordmark-${width}.webp`);
  }

  const emblem = sharp(SRC_EMBLEM).trim({ threshold: 1 });
  const em = await emblem.clone().png().toBuffer({ resolveWithObject: true });
  console.log("emblem trimmed to", em.info.width, "x", em.info.height);
  await sharp(em.data).resize({ width: 480 }).png({ compressionLevel: 9 }).toFile(`${OUT}/emblem-480.png`);
  await sharp(em.data).resize({ width: 480 }).webp({ quality: 90, alphaQuality: 100 }).toFile(`${OUT}/emblem-480.webp`);

  // App icons: emblem centred on a warm-ivory square with clear space (the
  // emblem is navy/gold and needs a light ground to stay legible).
  const square = async (size: number, pad: number) => {
    const inner = size - pad * 2;
    const mark = await sharp(em.data).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: "#F8F6F1" } })
      .composite([{ input: mark, gravity: "center" }])
      .png();
  };
  await (await square(512, 40)).toFile("src/app/icon.png");
  await (await square(180, 14)).toFile("src/app/apple-icon.png");
  await (await square(48, 3)).toFile(`${OUT}/favicon-48.png`);

  // Social share fallback image: wordmark on ivory, 1200x630.
  const ogMark = await sharp(wm.data).resize({ width: 760 }).toBuffer();
  await sharp({ create: { width: 1200, height: 630, channels: 4, background: "#F8F6F1" } })
    .composite([{ input: ogMark, gravity: "center" }])
    .png()
    .toFile(`${OUT}/og-default.png`);

  console.log("Brand derivatives written to", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
