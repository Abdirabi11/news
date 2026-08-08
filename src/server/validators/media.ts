/**
 * Zod validators — Media.
 */
import { z } from "zod";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/server/services/storage";
 
export const presignMediaSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z
    .string()
    // FIX: Changed .has() to .includes() because ALLOWED_IMAGE_TYPES is an Array
    .refine((m) => ALLOWED_IMAGE_TYPES.includes(m), "Unsupported file type."),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(MAX_UPLOAD_BYTES, "File exceeds the 10 MB upload limit."),
});
 
export const registerMediaSchema = z.object({
  /** Must be a key previously issued by /api/media/presign. */
  storageKey: z
    .string()
    .regex(
      /^uploads\/[0-9a-f-]{36}\/[a-z0-9.-]+$/,
      "Invalid storage key format.",
    ),
  mimeType: z
    .string()
    // FIX: Changed .has() to .includes() here too
    .refine((m) => ALLOWED_IMAGE_TYPES.includes(m), "Unsupported file type."),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  width: z.number().int().positive().max(20_000).optional(),
  height: z.number().int().positive().max(20_000).optional(),
  altText: z.string().max(300).optional(),
  caption: z.string().max(500).optional(),
});
 
export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});
 
export type PresignMediaInput = z.infer<typeof presignMediaSchema>;
export type RegisterMediaInput = z.infer<typeof registerMediaSchema>;