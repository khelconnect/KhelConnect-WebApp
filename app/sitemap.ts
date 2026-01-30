import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://khelconnect.in",
      lastModified: new Date(),
    },
    {
      url: "https://khelconnect.in/turfs",
      lastModified: new Date(),
    },
  ]
}
