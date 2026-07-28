"use client";

import { useEffect } from "react";

export function ViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    // StrictMode double-invokes effects in dev; the second fire is
    // harmless (one extra dev-only count) and production runs once.
    void fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId }),
      keepalive: true,
    }).catch(() => {
      /* never surface analytics errors */
    });
  }, [articleId]);

  return null;
}
