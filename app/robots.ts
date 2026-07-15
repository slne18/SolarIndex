import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/mon-espace",
        "/dashboard",
        "/checkout/",
        "/login",
        "/onboarding",
        "/success",
        "/api/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
