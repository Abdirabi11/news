import { redis, redisKeys } from "@/server/redis/client";
 
export const viewField = (articleId: string, date = new Date()): string =>
  `${articleId}:${date.toISOString().slice(0, 10)}`;
 
/** Parse a hash field back into its parts (used by the flush worker). */
export const parseViewField = (
  field: string,
): { articleId: string; date: string } | null => {
  // cuid contains no ':' — the last segment is always the date.
  const idx = field.lastIndexOf(":");
  if (idx === -1) return null;
  const articleId = field.slice(0, idx);
  const date = field.slice(idx + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !articleId) return null;
  return { articleId, date };
};
 
export async function trackView(articleId: string): Promise<void> {
  try {
    await redis.hincrby(redisKeys.pendingViews(), viewField(articleId), 1);
  } catch (err) {
    // Never let analytics break a page render.
    console.error("[views] failed to track view:", err);
  }
}
 