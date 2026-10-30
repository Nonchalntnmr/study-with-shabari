import { afterEach, describe, expect, it, vi } from "vitest";
import { UploadError, storageConfigured, storeImage } from "@/lib/storage";

// Admin image uploads need the Supabase service-role key, which is read only here, on the server.
// Without it on Vercel, an upload is refused with a plain message before anything is read or stored.
describe("image uploads without the service-role key", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("are off on Vercel, with a message for the admin", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(storageConfigured()).toMatchObject({ ok: false });
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "x.png", { type: "image/png" });
    await expect(storeImage(file, "alt", "admin")).rejects.toThrow(UploadError);
    await expect(storeImage(file, "alt", "admin")).rejects.toThrow("Image uploads aren’t switched on for this site yet");
  });

  it("use Supabase once the URL and key are both set", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    expect(storageConfigured()).toEqual({ ok: true, provider: "supabase" });
  });
});
