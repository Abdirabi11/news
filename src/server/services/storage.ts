import crypto from "crypto";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export function cloudinaryConfig() {
  return {
    cloudName: requireEnv("CLOUDINARY_CLOUD_NAME"),
    apiKey: requireEnv("CLOUDINARY_API_KEY"),
    apiSecret: requireEnv("CLOUDINARY_API_SECRET"),
  };
}

export interface SignedUpload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

/**
 * Produce a signature for a direct browser upload.
 *
 * Cloudinary signs the alphabetically-sorted set of params that will
 * be sent (excluding file, api_key, resource_type, cloud_name), joined
 * as key=value&key=value, with the api_secret appended, hashed SHA-1.
 *
 * We keep the signed param set deliberately small and fixed (folder +
 * timestamp) so the client cannot smuggle in extra signed params.
 */
export function signUpload(opts: { folder?: string } = {}): SignedUpload {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = opts.folder ?? "newsroom";

  // Params to sign, sorted alphabetically by key.
  const toSign: Record<string, string | number> = { folder, timestamp };
  const signatureBase = Object.keys(toSign)
    .sort()
    .map((k) => `${k}=${toSign[k]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(signatureBase + apiSecret)
    .digest("hex");

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

/**
 * Shape of the Cloudinary upload response fields we care about.
 * (Cloudinary returns many more; these map cleanly to our Media model.)
 */
export interface CloudinaryAsset {
  secure_url: string;
  public_id: string;
  bytes: number;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
}

/**
 * Map a Cloudinary asset to our Media create-input shape. The caller
 * supplies uploaderId + optional altText/caption. public_id becomes
 * our storageKey (unique), secure_url our url.
 */
export function assetToMediaInput(
  asset: CloudinaryAsset,
  uploaderId: string,
  extra: { altText?: string; caption?: string } = {},
) {
  return {
    uploaderId,
    storageKey: asset.public_id,
    url: asset.secure_url,
    mimeType: `${asset.resource_type}/${asset.format}`,
    sizeBytes: asset.bytes,
    width: asset.width ?? null,
    height: asset.height ?? null,
    altText: extra.altText ?? null,
    caption: extra.caption ?? null,
    processed: true, // Cloudinary handles derivations on the fly
  };
}


export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
];

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Ensures compatibility with existing API routes that expect a publicUrl helper.
 */
export function publicUrl(storageKeyOrUrl: string) {
  // If it's already a full Cloudinary URL, just return it
  if (storageKeyOrUrl.startsWith("http")) return storageKeyOrUrl;
  
  // Otherwise, construct the Cloudinary URL from the public_id
  const { cloudName } = cloudinaryConfig();
  return `https://res.cloudinary.com/${cloudName}/image/upload/${storageKeyOrUrl}`;
}