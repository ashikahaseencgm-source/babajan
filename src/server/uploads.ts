import "server-only";
import sharp, { type Metadata } from "sharp";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "@/server/crypto";

/**
 * Image upload pipeline. Every upload is decoded and RE-ENCODED with sharp:
 * this rejects non-images regardless of the claimed MIME type, strips EXIF
 * (including GPS) and neutralises polyglot files. Output is WebP, max 2400px.
 *
 * Storage driver: local filesystem under public/uploads (development / single
 * server with persistent disk). For serverless or multi-instance hosting,
 * replace `store()` with an object-storage driver — see docs/DEPLOYMENT.md.
 */
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads");

export type StoredImage = { url: string; width: number; height: number };

export class UploadError extends Error {}

export async function processImageUpload(file: File, folder: "products" | "content" | "collections"): Promise<StoredImage> {
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Please choose an image file.");
  if (file.size > MAX_BYTES) throw new UploadError("Images must be 8 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());

  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UploadError("That file isn't a supported image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new UploadError("Please upload a JPEG, PNG, WebP or AVIF image.");
  if (!meta.width || !meta.height || meta.width < 400 || meta.height < 400) {
    throw new UploadError("Images should be at least 400 × 400 pixels so they stay sharp.");
  }

  const { data, info } = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate() // honour EXIF orientation before metadata is stripped
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86 })
    .toBuffer({ resolveWithObject: true });

  return store(data, folder, info.width, info.height);
}

async function store(data: Buffer, folder: string, width: number, height: number): Promise<StoredImage> {
  const now = new Date();
  const rel = path.posix.join(folder, String(now.getFullYear()), `${randomToken(12)}.webp`);
  const abs = path.join(UPLOAD_ROOT, ...rel.split("/"));
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data, { flag: "wx" });
  return { url: `/uploads/${rel}`, width, height };
}

export async function deleteStoredImage(url: string) {
  if (!/^\/uploads\/[A-Za-z0-9/_-]+\.webp$/.test(url)) return;
  const abs = path.join(UPLOAD_ROOT, ...url.replace(/^\/uploads\//, "").split("/"));
  if (!abs.startsWith(UPLOAD_ROOT)) return;
  await unlink(abs).catch(() => {});
}
