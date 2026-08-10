import { MediaLibrary } from "@/components/editorial/media-library";

export const metadata = { title: "Media — Lower Shabelle Media" };

export default function MediaPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Media</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Images uploaded here are served from the CDN and can be used
          as covers or inside article bodies.
        </p>
      </div>
      <MediaLibrary />
    </div>
  );
}
