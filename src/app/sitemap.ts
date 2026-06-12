import { MetadataRoute } from 'next';
import { getAllPages } from '@/api/wordpressApi';

const EXCLUDED_SLUGS = ['home', 'front-page', 'inicio', 'login', 'blog'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const pages = await getAllPages('?per_page=100&_fields=slug,modified');

  const staticUrls: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  const pageUrls: MetadataRoute.Sitemap = (pages || [])
    .filter((page) => !EXCLUDED_SLUGS.includes(page.slug))
    .map((page) => ({
      url: `${baseUrl}/${page.slug}`,
      lastModified: new Date(page.modified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  return [...staticUrls, ...pageUrls];
}
