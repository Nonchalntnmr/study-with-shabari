import { db } from "@/lib/db";
import { readLocalAsset } from "@/lib/storage";

// Serves locally stored uploads (development). In production images come from Supabase Storage.
export async function GET(_request: Request, ctx: RouteContext<"/api/assets/[id]">) {
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset || asset.provider !== "local") return new Response("Not found", { status: 404 });
  const bytes = await readLocalAsset(asset.storageKey);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
