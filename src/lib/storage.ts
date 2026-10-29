import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/security/hash";
import { sniffImageType } from "@/lib/image-type";

// Diagrams for passages and questions. Supabase Storage in production; a local
// folder in development. SVG is refused: it can carry script.

// Vercel rejects request bodies over 4.5 MB, so the limit stays below that with room for form overhead.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const LOCAL_DIR = path.join(process.cwd(), ".local", "uploads");

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "diagrams";
  return url && key ? { url: url.replace(/\/$/, ""), key, bucket } : null;
}

export function storageConfigured(): { ok: boolean; provider: "supabase" | "local"; reason?: string } {
  if (supabaseConfig()) return { ok: true, provider: "supabase" };
  // Vercel's filesystem is ephemeral, so local storage would silently lose files.
  if (process.env.VERCEL) return { ok: false, provider: "local", reason: "Supabase Storage is not configured" };
  return { ok: true, provider: "local" };
}

export function assetUrl(asset: { id: string; provider: string; storageKey: string }): string {
  const cfg = supabaseConfig();
  if (asset.provider === "supabase" && cfg) {
    return `${cfg.url}/storage/v1/object/public/${cfg.bucket}/${asset.storageKey}`;
  }
  return `/api/assets/${asset.id}`;
}

export class UploadError extends Error {}

export async function storeImage(file: File, alt: string, createdById: string) {
  const status = storageConfigured();
  if (!status.ok) throw new UploadError(status.reason);
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 4 MB or smaller.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImageType(bytes);
  if (!kind) throw new UploadError("Only PNG, JPEG, GIF and WebP images are accepted.");

  const storageKey = `${new Date().toISOString().slice(0, 7)}/${randomToken(12)}.${kind.ext}`;
  const cfg = supabaseConfig();
  if (cfg) {
    const supabase = createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
    const { error } = await supabase.storage
      .from(cfg.bucket)
      .upload(storageKey, bytes, { contentType: kind.type, upsert: false });
    if (error) throw new UploadError(`Upload failed: ${error.message}`);
  } else {
    const target = path.join(LOCAL_DIR, storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }

  return db.asset.create({
    data: {
      storageKey,
      provider: cfg ? "supabase" : "local",
      contentType: kind.type,
      byteSize: bytes.byteLength,
      alt: alt.trim().slice(0, 300),
      createdById,
    },
  });
}

export async function readLocalAsset(storageKey: string): Promise<Buffer | null> {
  const target = path.resolve(LOCAL_DIR, storageKey);
  if (!target.startsWith(LOCAL_DIR + path.sep)) return null;
  try {
    return await readFile(target);
  } catch {
    return null;
  }
}
