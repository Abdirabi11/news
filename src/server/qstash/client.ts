import { Client } from "@upstash/qstash";

declare global {
  var qstashGlobal: Client | undefined;
}

export const qstash: Client =
  globalThis.qstashGlobal ?? new Client({ token: process.env.QSTASH_TOKEN! });

if (process.env.NODE_ENV !== "production") {
  globalThis.qstashGlobal = qstash;
}

export function siteUrl(): string {
  const url = process.env.SITE_URL;
  if (!url) throw new Error("SITE_URL is required to publish QStash jobs");
  return url.replace(/\/$/, "");
}
