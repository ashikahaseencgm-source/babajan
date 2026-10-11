import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/account", "/checkout", "/bag", "/api/", "/orders/", "/search"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
