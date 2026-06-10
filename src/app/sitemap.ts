import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://amg-eight.vercel.app';

  const routes = [
    { url: '', priority: 1.0, changeFrequency: 'daily' },
    { url: '/dashboard', priority: 0.9, changeFrequency: 'always' },
    { url: '/gold-signals', priority: 0.9, changeFrequency: 'always' },
    { url: '/scalping-v2', priority: 0.8, changeFrequency: 'always' },
    { url: '/scalping', priority: 0.7, changeFrequency: 'always' },
    { url: '/on-chain', priority: 0.8, changeFrequency: 'always' },
    { url: '/completed', priority: 0.6, changeFrequency: 'daily' },
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route.url}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency as 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never',
    priority: route.priority,
  }));
}
