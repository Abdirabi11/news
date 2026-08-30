"use client";

import { useRef, useState } from "react";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
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

interface MediaPage {
  data: MediaItem[];
  meta: { page: number; totalPages: number };
}

interface MediaLibraryProps {
  /** Picker mode: called when the user chooses an item. */
  onSelect?: (item: MediaItem) => void;
  /** Compact grid for modal usage. */
  compact?: boolean;
}

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const MAX_BYTES = 10 * 1024 * 1024;

const QUERY_KEY = ["media-library"];

async function fetchMediaPage(page: number): Promise<MediaPage> {
  const res = await fetch(`/api/media?page=${page}&pageSize=24`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function MediaLibrary({ onSelect, compact = false }: MediaLibraryProps) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Data fetching lives in react-query rather than an effect: this
  // component mounts/unmounts repeatedly (it's also used inline as a
  // modal picker in the article editor), so the shared query cache
  // avoids re-fetching page 1 every time the picker re-opens.
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isError,
  } = useInfiniteQuery({
    queryKey: QUERY_KEY,
    queryFn: ({ pageParam }) => fetchMediaPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
  });

  const items = data?.pages.flatMap((p) => p.data) ?? [];
  const error = uploadError ?? (isError ? "Could not load the media library. Refresh to retry." : null);

  async function handleUpload(file: File) {
    setUploadError(null);

    if (file.size > MAX_BYTES) {
      setUploadError("File is larger than the 10 MB limit.");
      return;
    }
    if (!ACCEPTED.split(",").includes(file.type)) {
      setUploadError("Unsupported file type. Use JPEG, PNG, WebP, AVIF, or GIF.");
      return;
    }

    setUploading(true);
    try {
      // 1. Presign — get a Cloudinary signature from our backend.
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

      // 2. POST the file to Cloudinary with the signed params.
      //    Cloudinary requires multipart POST — NOT a raw PUT.
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", presign.apiKey);
      form.append("timestamp", String(presign.timestamp));
      form.append("signature", presign.signature);
      form.append("folder", presign.folder);

      const uploadRes = await fetch(presign.uploadUrl, {
        method: "POST",
        body: form, // do NOT set Content-Type; the browser sets the multipart boundary
      });
      if (!uploadRes.ok) {
        const body = await uploadRes.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? "Upload to Cloudinary failed.",
        );
      }
      const asset = await uploadRes.json();

      // 3. Register the Cloudinary asset in our Media model.
      const registerRes = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey: asset.public_id,
          url: asset.secure_url,
          mimeType: file.type,
          sizeBytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          altText: file.name.replace(/\.[^.]*$/, "").replaceAll(/[-_]+/g, " "),
        }),
      });
      if (!registerRes.ok) {
        const body = await registerRes.json().catch(() => null);
        throw new Error(body?.error ?? "Could not register the upload.");
      }
      const { data: media } = await registerRes.json();

      // Prepend into the cached first page rather than refetching —
      // keeps the "new upload appears instantly" UX.
      queryClient.setQueryData<InfiniteData<MediaPage>>(QUERY_KEY, (old) => {
        if (!old) return old;
        const [first, ...rest] = old.pages;
        return { ...old, pages: [{ ...first, data: [media, ...first.data] }, ...rest] };
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
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
      {isLoading && items.length === 0 ? (
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
      {hasNextPage && (
        <div className="mt-4 text-center">
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}