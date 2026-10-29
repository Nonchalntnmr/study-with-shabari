import type { MetadataRoute } from "next";
import { CANONICAL_HOST } from "@/lib/site";

const production = (process.env.VERCEL_ENV ?? process.env.SITE_ENV) === "production";

export default function robots(): MetadataRoute.Robots {
  if (!production) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/dashboard", "/exam", "/api", "/login", "/signup"] }],
    sitemap: `https://${CANONICAL_HOST}/sitemap.xml`,
    host: `https://${CANONICAL_HOST}`,
  };
}
