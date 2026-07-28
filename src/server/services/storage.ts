/**
 * Object storage service (Cloudflare R2 / S3-compatible).
 *
 * Upload flow (presigned, so files never pass through our server):
 *   1. Client: POST /api/media/presign {filename, mimeType, sizeBytes}
 *   2. Server: validates, returns {uploadUrl, storageKey}
 *   3. Client: PUT file bytes to uploadUrl
 *   4. Client: POST /api/media {storageKey, ...metadata}
 *      → Media row created; thumbnail job enqueued in Phase 3.
 *
 * Requires: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 *
 * Env:
 *   STORAGE_ENDPOINT           e.g. https://<account>.r2.cloudflarestorage.com
 *   STORAGE_REGION             "auto" for R2
 *   STORAGE_BUCKET
 *   STORAGE_ACCESS_KEY_ID
 *   STORAGE_SECRET_ACCESS_KEY
 *   CDN_BASE_URL               public base, e.g. https://media.example.com
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
 
const required = (name: string): string => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
};
 
let _client: S3Client | null = null;
const s3 = (): S3Client => {
  _client ??= new S3Client({
    endpoint: required("STORAGE_ENDPOINT"),
    region: process.env.STORAGE_REGION ?? "auto",
    credentials: {
      accessKeyId: required("STORAGE_ACCESS_KEY_ID"),
      secretAccessKey: required("STORAGE_SECRET_ACCESS_KEY"),
    },
  });
  return _client;
};
 
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
]);
 
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
 
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};
 
/**
 * Build a collision-proof storage key. The original filename is
 * reduced to a short sanitized stem (for human-readable URLs); the
 * UUID guarantees uniqueness; the extension comes from the DECLARED
 * mime type, never from the user-supplied filename.
 */
export const buildStorageKey = (filename: string, mimeType: string): string => {
  const stem =
    filename
      .toLowerCase()
      .replace(/\.[^.]*$/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "upload";
  return `uploads/${randomUUID()}/${stem}.${EXT_BY_MIME[mimeType] ?? "bin"}`;
};
 
/** Presigned PUT URL, bound to key + content type, 10-minute TTL. */
export const presignUpload = async (
  storageKey: string,
  mimeType: string,
  sizeBytes: number,
): Promise<string> =>
  getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: required("STORAGE_BUCKET"),
      Key: storageKey,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    }),
    { expiresIn: 600 },
  );
 
/** Public CDN URL for a stored object. */
export const publicUrl = (storageKey: string): string =>
  `${required("CDN_BASE_URL").replace(/\/$/, "")}/${storageKey}`;
 