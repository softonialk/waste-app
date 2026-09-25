import type { MetadataRoute } from "next";

const base = "https://www.nextgen.mom";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/system?role=household`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/system?role=collector`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
