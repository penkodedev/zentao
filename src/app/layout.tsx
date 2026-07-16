// src/app/layout.tsx

import type { Metadata } from 'next';
import type { ReactNode } from "react";
import dynamic from 'next/dynamic';

import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SWRConfig } from 'swr';

import "@/styles/sass/main.scss";

import HeaderServer from '@/components/layout/header/HeaderServer';
import Footer from "@/components/layout/footer/Footer";

import CodeBlockCopier from "@/components/ui/CodeBlockCopier";

import CookieConsent from "@/components/cookies/CookieConsent";
import CookieManager from "@/components/cookies/CookieManager";
import ScrollToTop from "@/components/navigation/ScrollToTop";
import AdvertisingPopup from '@/components/features/modals/AdvertisingPopup';
import TooltipsProvider from '@/components/features/tooltips/Tooltips';

import BodyClass from "@/utils/wordpress/BodyClass";
import { WpPageIdProvider } from '@/utils/wordpress/WpPageIdContext';
import localesConfig from '@/i18n/locales.generated.json';
import Analytics from '@/components/tracking/Analytics';
import WpStyles from '@/components/wordpress/WpStyles';
import { safeGetSiteInfo, getAppearanceSettings, fetchMenuByLocation } from '@/api/wordpressApi';
import type { AppearanceSettings } from '@/api/wordpressApi';
import type { MenuItem } from '@/types/wordpressTypes';

// Lazy load heavy components that aren't needed on every page
const ModalController = dynamic(() => import('@/components/features/modals/ModalController'), {
  ssr: false
});

const SmoothScroll = dynamic(() => import('@/components/animations/lenis/SmoothScroll'), {
  ssr: false
});

const ScrollProgress = dynamic(() => import('@/components/animations/ScrollProgress'), {
  ssr: false
});

const ParallaxEffects = dynamic(() => import('@/components/animations/gsap/ParallaxEffects'), {
  ssr: false
});

const LightboxController = dynamic(() => import('@/components/features/lightbox/LightboxController'), {
  ssr: false
});

const ChatBot = dynamic(() => import('@/components/ui/ChatBot'), {
  ssr: false
});

const ChatWhatsApp = dynamic(() => import('@/components/ui/ChatWhatsApp'), {
  ssr: false
});

// Cache siteInfo for the lifetime of this server instance to avoid duplicate WP calls
let cachedLayoutSiteInfo: Awaited<ReturnType<typeof safeGetSiteInfo>> | null = null;
async function getCachedLayoutSiteInfo(locale: string) {
  if (!cachedLayoutSiteInfo) {
    cachedLayoutSiteInfo = await safeGetSiteInfo(locale);
  }
  return cachedLayoutSiteInfo;
}

// Generate dynamic metadata from WordPress
export async function generateMetadata(): Promise<Metadata> {
  const headersList = headers();
  const locale = (headersList.get('x-locale') || localesConfig.defaultLocale) as string;
  const siteInfo = await getCachedLayoutSiteInfo(locale);
  
  if (!siteInfo) {
    // Fallback metadata if WordPress is unreachable
    return {
      metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
      title: {
        default: 'Next-WP Kit',
        template: '%s',
      },
      description: process.env.NEXT_PUBLIC_SITE_DESCRIPTION || 'An advanced starter kit for building websites with Next.js and WordPress as headless CMS.',
    };
  }

  return {
    metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
    title: {
      default: siteInfo.title,
      template: '%s', // Use title exactly as WordPress returns it
    },
    description: siteInfo.description,
    // Dynamic favicons from WordPress Site Icon (only include valid URLs)
    icons: (() => {
      const f = siteInfo.favicons;
      if (!f) return undefined;
      const icon = [
        f.icon_32 && { url: f.icon_32, sizes: '32x32', type: 'image/png' as const },
        f.icon_192 && { url: f.icon_192, sizes: '192x192', type: 'image/png' as const },
      ].filter(Boolean) as { url: string; sizes: string; type: string }[];
      const apple = [
        f.icon_180 && { url: f.icon_180, sizes: '180x180', type: 'image/png' as const },
      ].filter(Boolean) as { url: string; sizes: string; type: string }[];
      const other = [
        f.icon_512 && { rel: 'icon' as const, url: f.icon_512, sizes: '512x512', type: 'image/png' as const },
      ].filter(Boolean) as { rel: string; url: string; sizes: string; type: string }[];
      if (icon.length === 0 && apple.length === 0 && other.length === 0) return undefined;
      return { icon, apple, other };
    })(),
    openGraph: {
      title: siteInfo.title,
      description: siteInfo.description,
      siteName: siteInfo.title,
      locale: siteInfo.i18n?.default_locale 
        ? `${siteInfo.i18n.default_locale}_${siteInfo.i18n.default_locale.toUpperCase()}` 
        : 'es_ES',
      type: 'website',
    },
    verification: {
      google: '1niwhUTul8A_GNN-0I9a47sYXmCx1IaoObIeRJSaEts',
    },
    twitter: {
      card: 'summary_large_image',
      title: siteInfo.title,
      description: siteInfo.description,
    },
  };
}

type RootLayoutProps = {
  children: ReactNode;
};

function GlobalUI({ appearance }: { appearance: AppearanceSettings | null }) {
  const ui = appearance ?? {} as Partial<AppearanceSettings>;
  return (
    <>
      <CookieConsent />
      <CookieManager />
      {ui.popups !== false && <ModalController />}
      {ui.lightbox !== false && <LightboxController />}
      {ui.popups !== false && <AdvertisingPopup />}

      <div className="fixed-actions" role="group" aria-label="Quick actions">
        {ui.scrollToTop !== false && <ScrollToTop />}
        <ChatBot />
        <ChatWhatsApp />
      </div>
    </>
  );
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const headersList = headers();
  const currentLocaleForFetch = (headersList.get('x-locale') || localesConfig.defaultLocale) as string;
  const currentLocale = currentLocaleForFetch;

  const [siteInfo, appearance, messages, mainMenu] = await Promise.all([
    getCachedLayoutSiteInfo(currentLocaleForFetch),
    getAppearanceSettings(),
    getMessages({ locale: currentLocaleForFetch }),
    fetchMenuByLocation('mainnav', currentLocaleForFetch).catch(() => null),
  ]);

  const defaultLocale = siteInfo?.i18n?.default_locale || localesConfig.defaultLocale;
  const supportedLocales = siteInfo?.i18n?.locales || localesConfig.supportedLocales;
  

  const wpOrigin = process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.replace('/wp-json', '') || '';

  return (
    <html lang={currentLocale} suppressHydrationWarning>
      <head>
        {wpOrigin && (
          <>
            <link rel="preconnect" href={wpOrigin} />
            <link rel="preconnect" href={wpOrigin} crossOrigin="anonymous" />
          </>
        )}
        <WpStyles />
        {/* Language sync script in head for immediate execution */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var supportedLocales = ${JSON.stringify(supportedLocales)};
                var defaultLocale = ${JSON.stringify(defaultLocale)};
                
                function updateLang() {
                  var path = window.location.pathname;
                  var firstSegment = path.split('/').filter(Boolean)[0];
                  var locale = supportedLocales.includes(firstSegment) ? firstSegment : defaultLocale;
                  document.documentElement.lang = locale;
                }
                updateLang();
                window.addEventListener('popstate', updateLang);
              })();
            `
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={currentLocale} messages={messages}>
          <SWRConfig
            value={{
              refreshInterval: 0,
              revalidateOnFocus: false,
              revalidateOnReconnect: true,
              dedupingInterval: 60000,
            }}
          >
            <WpPageIdProvider>
              {!appearance?.spaMode && appearance?.scrollProgress !== false && <ScrollProgress />}
              <SmoothScroll enabled={!appearance?.spaMode && appearance?.smoothScroll !== false}>
                {!appearance?.spaMode && <ParallaxEffects />}
                <BodyClass>
                  <TooltipsProvider>
                    <HeaderServer siteInfo={siteInfo} initialLocale={currentLocale} menusByLocale={mainMenu ? { [currentLocale]: mainMenu.items ?? [] } : undefined} />
                      <main>{children}</main>
                    <Footer siteInfo={siteInfo} />
                    <GlobalUI appearance={appearance} />
                  </TooltipsProvider>
                </BodyClass>
              </SmoothScroll>
            </WpPageIdProvider>
          </SWRConfig>
        </NextIntlClientProvider>
        <CodeBlockCopier />
        {siteInfo && (
          <Analytics
            gtmId={siteInfo.analytics.gtm_id}
            ga4Id={siteInfo.analytics.google_analytics_id}
            fbPixelId={siteInfo.analytics.facebook_pixel_id}
            twitterPixelId={siteInfo.analytics.twitter_pixel_id}
          />
        )}
      </body>
    </html>
  );
}