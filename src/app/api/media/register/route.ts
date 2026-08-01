import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/server/db/client";
import { assetToMediaInput, type CloudinaryAsset } from "@/server/services/storage";

const ALLOWED: Role[] = [Role.ADMIN, Role.EDITOR, Role.AUTHOR];

const assetSchema = z.object({
  secure_url: z.string().url(),
  public_id: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  format: z.string().min(1),
  resource_type: z.string().min(1),
  altText: z.string().max(500).optional(),
  caption: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !ALLOWED.includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = assetSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid asset payload", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { altText, caption, ...asset } = parsed.data;
  const data = assetToMediaInput(asset as CloudinaryAsset, session.user.id, {
    altText,
    caption,
  });

  try {
    const media = await prisma.media.create({
      data,
      select: { id: true, url: true, width: true, height: true, altText: true },
    });
    return NextResponse.json(media, { status: 201 });
  } catch (err) {
    // Most likely a unique-constraint hit on storageKey (re-register).
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
