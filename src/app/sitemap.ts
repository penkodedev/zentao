import { MetadataRoute } from 'next';
import { getAllPages } from '@/api/wordpressApi';
import localesConfig from '@/i18n/locales.generated.json';

// Slugs que no deben aparecer en el sitemap (páginas internas, duplicados de home, etc.)
const EXCLUDED_SLUGS = ['home', 'front-page', 'inicio', 'login', 'blog'];

const { supportedLocales, defaultLocale } = localesConfig;

/**
 * Builds a full URL for a given slug and locale.
 * The default locale has no prefix (/slug), other locales get a prefix (/en/slug).
 */
function buildUrl(baseUrl: string, slug: string | null, locale: string): string {
  const path = slug ? `/${slug}` : '/';
  return locale === defaultLocale
    ? `${baseUrl}${path}`
    : `${baseUrl}/${locale}${path}`;
}

/**
 * Builds the hreflang alternates object for a given slug.
 * Includes x-default pointing to the default language version, as Google recommends.
 */
function buildAlternates(baseUrl: string, slug: string | null) {
  const languages: Record<string, string> = {
    'x-default': buildUrl(baseUrl, slug, defaultLocale),
  };
  for (const locale of supportedLocales) {
    languages[locale] = buildUrl(baseUrl, slug, locale);
  }
  return { languages };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

  const pages = await getAllPages('?per_page=100&_fields=slug,modified');

  const homeEntry: MetadataRoute.Sitemap[0] = {
    url: buildUrl(baseUrl, null, defaultLocale),
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
    alternates: buildAlternates(baseUrl, null),
  };

  const pageEntries: MetadataRoute.Sitemap = (pages || [])
    .filter((page) => !EXCLUDED_SLUGS.includes(page.slug))
    .map((page) => ({
      url: buildUrl(baseUrl, page.slug, defaultLocale),
      lastModified: new Date(page.modified),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      alternates: buildAlternates(baseUrl, page.slug),
    }));

  return [homeEntry, ...pageEntries];
}
