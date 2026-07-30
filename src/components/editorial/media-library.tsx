"use client"

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Loader2, ImageOff, Check } from "lucide-react";

export interface MediaItem {
  id: string;
  url: string;
  altText: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  processed: boolean;
  createdAt: string;
}

interface MediaLibraryProps {
  /** Picker mode: called when the user chooses an item. */
  onSelect?: (item: MediaItem) => void;
  /** Compact grid for modal usage. */
  compact?: boolean;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

export function MediaLibrary({ onSelect, compact = false }: MediaLibraryProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async (pageToLoad: number, append: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media?page=${pageToLoad}&pageSize=24`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setItems((prev) => (append ? [...prev, ...body.data] : body.data));
      setTotalPages(body.meta.totalPages);
      setPage(pageToLoad);
    } catch {
      setError("Could not load the media library. Refresh to retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(1, false);
  }, [load]);

  async function handleUpload(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("File is larger than the 10 MB limit.");
      return;
    }
    if (!ACCEPTED.split(",").includes(file.type)) {
      setError("Unsupported file type. Use JPEG, PNG, WebP, AVIF, or GIF.");
      return;
    }

    setUploading(true);
    try {
      // 1. Presign
      const presignRes = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not start the upload.");
      }
      const { data: presign } = await presignRes.json();

      // 2. Direct PUT to the bucket
      const putRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(
          "Upload to storage failed. Check the bucket CORS policy allows PUT from this origin.",
        );
      }

      // 3. Read provisional dimensions, then register
      let width: number | undefined;
      let height: number | undefined;
      try {
        const bmp = await createImageBitmap(file);
        width = bmp.width;
        height = bmp.height;
        bmp.close();
      } catch {
        /* non-fatal — the worker reads true dimensions later */
      }

      const registerRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: presign.storageKey,
          mimeType: file.type,
          sizeBytes: file.size,
          width,
          height,
          altText: file.name.replace(/\.[^.]*$/, "").replaceAll(/[-_]+/g, " "),
        }),
      });
      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not register the upload.");
      }
      const { data: media } = await registerRes.json();
      setItems((prev) => [media, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  const gridCols = compact
    ? "grid-cols-3 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6";

  return (
    <div>
      {/* Upload control */}
      <div className="flex items-center justify-between gap-4">
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="inline-flex items-center gap-2 rounded-md bg-indigo-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-800 disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-4 w-4" aria-hidden />
          )}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        {onSelect && (
          <p className="text-xs text-zinc-500">Click an image to select it.</p>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* Grid */}
      {loading && items.length === 0 ? (
        <div className={`mt-4 grid gap-3 ${gridCols}`}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-zinc-200" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <ImageOff className="h-8 w-8 text-zinc-300" aria-hidden />
          <p className="text-sm font-medium text-zinc-600">No media yet</p>
          <p className="text-sm text-zinc-400">
            Upload the first image to build your library.
          </p>
        </div>
      ) : (
        <ul className={`mt-4 grid gap-3 ${gridCols}`}>
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onSelect?.(m)}
                disabled={!onSelect}
                className={`group relative block aspect-square w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 ${
                  onSelect
                    ? "cursor-pointer transition-shadow hover:ring-2 hover:ring-indigo-600"
                    : "cursor-default"
                }`}
              >
                {/* Plain <img>: CDN URLs; next/image is for the reader site */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={m.url}
                  alt={m.altText ?? ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                {!m.processed && (
                  <span className="absolute start-1.5 top-1.5 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    processing
                  </span>
                )}
                {onSelect && (
                  <span className="absolute inset-0 hidden items-center justify-center bg-indigo-700/50 group-hover:flex">
                    <Check className="h-6 w-6 text-white" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Load more */}
      {page < totalPages && (
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={loading}
            onClick={() => void load(page + 1, true)}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
