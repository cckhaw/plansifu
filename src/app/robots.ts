import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo-helpers";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API endpoints (affiliate redirect, social card generator, plan relay) and the private crawl report are never indexed.
        disallow: ["/api/redirect", "/api/og", "/api/", "/crawl-report"],
      },
      {
        // Link-preview crawlers must be able to fetch the social card (/api/og), so they get a narrower rule.
        userAgent: ["Twitterbot", "facebookexternalhit", "LinkedInBot", "WhatsApp", "TelegramBot", "Slackbot", "Discordbot"],
        allow: "/",
        disallow: ["/api/redirect", "/crawl-report"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
