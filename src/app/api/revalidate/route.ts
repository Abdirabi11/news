import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
 
export const dynamic = "force-dynamic";
 
const bodySchema = z.object({
  paths: z.array(z.string().startsWith("/").max(500)).max(200).default([]),
  tags: z.array(z.string().min(1).max(100)).max(50).default([]),
});
 
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error("[revalidate] REVALIDATE_SECRET is not configured");
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }
 
  const provided = req.headers.get("x-revalidate-secret");
  if (provided !== secret) {
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
    // @ts-ignore - Next.js type definition mismatch false-positive
    revalidateTag(tag);
  }
 
  return NextResponse.json({
    revalidated: true,
    paths: parsed.data.paths.length,
    tags: parsed.data.tags.length,
  });
}