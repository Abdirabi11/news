import { useRef, useState } from "react";
import { UploadCloud, Loader2, Check, AlertCircle } from "lucide-react";

export interface UploadedMedia {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
}

type Phase = "idle" | "signing" | "uploading" | "registering" | "done" | "error";

export function MediaUploader({
  folder = "newsroom",
  onUploaded,
}: {
  folder?: string;
  onUploaded?: (media: UploadedMedia) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const busy =
    phase === "signing" || phase === "uploading" || phase === "registering";

  async function handleFile(file: File) {
    setError(null);
    setPreview(URL.createObjectURL(file));

    try {
      // 1. Get a signature from our backend.
      setPhase("signing");
      const signRes = await fetch("/api/media/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder }),
      });
      if (!signRes.ok) throw new Error("Could not sign upload.");
      const signed = await signRes.json();

      // 2. Upload directly to Cloudinary (XHR for progress).
      setPhase("uploading");
      setProgress(0);
      const asset = await uploadToCloudinary(file, signed, setProgress);

      // 3. Register the asset in our Media model.
      setPhase("registering");
      const regRes = await fetch("/api/media/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secure_url: asset.secure_url,
          public_id: asset.public_id,
          bytes: asset.bytes,
          width: asset.width,
          height: asset.height,
          format: asset.format,
          resource_type: asset.resource_type,
          altText: file.name.replace(/\.[^.]+$/, ""),
        }),
      });
      if (!regRes.ok) throw new Error("Upload saved to Cloudinary but failed to register.");
      const media: UploadedMedia = await regRes.json();

      setPhase("done");
      onUploaded?.(media);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setPhase("error");
    }
  }

  return (
    <div className="rounded-3xl bg-surface p-6 shadow-soft">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl bg-canvas px-6 py-10 text-center transition hover:bg-wood disabled:opacity-70"
      >
        {preview && (phase === "done" || busy) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className="h-32 w-full max-w-xs rounded-xl object-cover"
          />
        ) : (
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-soft text-sage">
            <UploadCloud className="h-7 w-7" aria-hidden />
          </span>
        )}

        <span className="text-sm font-medium text-ink">
          {phase === "idle" && "Click to upload an image"}
          {phase === "signing" && "Preparing…"}
          {phase === "uploading" && `Uploading… ${progress}%`}
          {phase === "registering" && "Finishing…"}
          {phase === "done" && "Uploaded"}
          {phase === "error" && "Try again"}
        </span>

        {busy && (
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Please keep this tab open
          </span>
        )}
        {phase === "done" && (
          <span className="flex items-center gap-1.5 text-xs font-medium text-sage">
            <Check className="h-3.5 w-3.5" aria-hidden /> Saved to media library
          </span>
        )}
      </button>

      {/* Progress bar */}
      {phase === "uploading" && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-wood">
          <div
            className="h-full rounded-full bg-sage transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <p className="mt-4 flex items-center gap-2 text-sm text-terracotta">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Direct multipart upload to Cloudinary with progress via XHR.
 * Only the signed params (folder, timestamp) plus api_key + signature
 * are sent — nothing that would invalidate the signature.
 */
function uploadToCloudinary(
  file: File,
  signed: {
    uploadUrl: string;
    apiKey: string;
    timestamp: number;
    signature: string;
    folder: string;
  },
  onProgress: (pct: number) => void,
): Promise<{
  secure_url: string;
  public_id: string;
  bytes: number;
  width?: number;
  height?: number;
  format: string;
  resource_type: string;
}> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("folder", signed.folder);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", signed.uploadUrl);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Malformed Cloudinary response."));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}
