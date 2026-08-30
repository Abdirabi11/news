import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  paths: z.array(z.string().startsWith("/").max(500)).max(200).default([]),
  tags: z.array(z.string().min(1).max(100)).max(50).default([]),
});

function isValidSecret(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  // Constant-time compare: length check first (leaking length alone
  // isn't the threat model here), then timingSafeEqual on the bytes.
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] REVALIDATE_SECRET is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const provided = req.headers.get("x-revalidate-secret");
  if (!isValidSecret(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
 
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body." }, { status: 422 });
  }
 
  for (const path of parsed.data.paths) {
    // Pass 'page' as the second argument to satisfy strict path types
    revalidatePath(path, "page");
  }
  
  for (const tag of parsed.data.tags) {
    // This route is an external webhook target, which is the one
    // case Next's docs call out for immediate expiry via `{ expire: 0 }`
    // — the bare single-arg form is deprecated in this Next version.
    revalidateTag(tag, { expire: 0 });
  }
 
  return NextResponse.json({
    revalidated: true,
    paths: parsed.data.paths.length,
    tags: parsed.data.tags.length,
  });
}