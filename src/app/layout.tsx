// src/app/layout.tsx

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

import { headers } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { SWRConfig } from 'swr';

import '@/styles/sass/main.scss';

import HeaderServer from '@/components/layout/header/HeaderServer';
import Footer from '@/components/layout/footer/Footer';

import CodeBlockCopier from '@/components/ui/CodeBlockCopier';

import CookieConsent from '@/components/cookies/CookieConsent';
import CookieManager from '@/components/cookies/CookieManager';
import ScrollToTop from '@/components/navigation/ScrollToTop';
import AdvertisingPopup from '@/components/features/modals/AdvertisingPopup';
import TooltipsProvider from '@/components/features/tooltips/Tooltips';

import BodyClass from '@/utils/wordpress/BodyClass';
import { WpPageIdProvider } from '@/utils/wordpress/WpPageIdContext';
import localesConfig from '@/i18n/locales.generated.json';
import Analytics from '@/components/tracking/Analytics';
import WpStyles from '@/components/wordpress/WpStyles';
import {
  safeGetSiteInfo,
  getAppearanceSettings,
  fetchMenuByLocation,
  getChatBotConfig,
} from '@/api/wordpressApi';
import type { AppearanceSettings } from '@/api/wordpressApi';

// Lazy load heavy client chunks (only requested when the component is rendered)
const ModalController = dynamic(() => import('@/components/features/modals/ModalController'), {
  ssr: false,
});

const SmoothScroll = dynamic(() => import('@/components/animations/lenis/SmoothScroll'), {
  ssr: false,
});

const ScrollProgress = dynamic(() => import('@/components/animations/ScrollProgress'), {
  ssr: false,
});

const ParallaxEffects = dynamic(() => import('@/components/animations/gsap/ParallaxEffects'), {
  ssr: false,
});

const LightboxController = dynamic(() => import('@/components/features/lightbox/LightboxController'), {
  ssr: false,
});

const ChatBot = dynamic(() => import('@/components/ui/ChatBot'), {
  ssr: false,
});

const ChatWhatsApp = dynamic(() => import('@/components/ui/ChatWhatsApp'), {
  ssr: false,
});

// Cache siteInfo per locale (process lifetime) — avoids wrong-locale reuse
const siteInfoByLocale = new Map<string, Awaited<ReturnType<typeof safeGetSiteInfo>>>();

async function getCachedLayoutSiteInfo(locale: string) {
  const key = locale || 'default';
  if (!siteInfoByLocale.has(key)) {
    siteInfoByLocale.set(key, await safeGetSiteInfo(locale));
  }
  return siteInfoByLocale.get(key) ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (headers().get('x-locale') || localesConfig.defaultLocale) as string;
  const siteInfo = await getCachedLayoutSiteInfo(locale);

  if (!siteInfo) {
    return {
      metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
      title: {
        default: 'Next-WP Kit',
        template: '%s',
      },
      description:
        process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
        'An advanced starter kit for building websites with Next.js and WordPress as headless CMS.',
    };
  }

  const f = siteInfo.favicons;
  const icon = [
    f?.icon_32 && { url: f.icon_32, sizes: '32x32', type: 'image/png' as const },
    f?.icon_192 && { url: f.icon_192, sizes: '192x192', type: 'image/png' as const },
  ].filter(Boolean) as { url: string; sizes: string; type: string }[];
  const apple = [
    f?.icon_180 && { url: f.icon_180, sizes: '180x180', type: 'image/png' as const },
  ].filter(Boolean) as { url: string; sizes: string; type: string }[];
  const other = [
    f?.icon_512 && {
      rel: 'icon' as const,
      url: f.icon_512,
      sizes: '512x512',
      type: 'image/png' as const,
    },
  ].filter(Boolean) as { rel: string; url: string; sizes: string; type: string }[];

  return {
    metadataBase: new URL(process.env.BASE_URL || 'http://localhost:3000'),
    title: {
      default: siteInfo.title,
      template: '%s',
    },
    description: siteInfo.description,
    icons:
      icon.length || apple.length || other.length
        ? { icon, apple, other }
        : undefined,
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

function GlobalUI({
  appearance,
  showChatBot,
}: {
  appearance: AppearanceSettings | null;
  showChatBot: boolean;
}) {
  const ui = appearance ?? ({} as Partial<AppearanceSettings>);

  return (
    <>
      <CookieConsent />
      <CookieManager />
      {ui.popups !== false && <ModalController />}
      {ui.lightbox !== false && <LightboxController />}
      {ui.popups !== false && <AdvertisingPopup />}

      <div className="fixed-actions" role="group" aria-label="Quick actions">
        {ui.scrollToTop !== false && <ScrollToTop />}
        {showChatBot && <ChatBot />}
        <ChatWhatsApp />
      </div>
    </>
  );
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const currentLocale = (headers().get('x-locale') || localesConfig.defaultLocale) as string;

  const [siteInfo, appearance, messages, mainMenu, chatBotConfig] = await Promise.all([
    getCachedLayoutSiteInfo(currentLocale),
    getAppearanceSettings(),
    getMessages({ locale: currentLocale }),
    fetchMenuByLocation('mainnav', currentLocale).catch(() => null),
    getChatBotConfig(currentLocale).catch(() => null),
  ]);

  const defaultLocale = siteInfo?.i18n?.default_locale || localesConfig.defaultLocale;
  const supportedLocales = siteInfo?.i18n?.locales || localesConfig.supportedLocales;
  const wpOrigin = process.env.NEXT_PUBLIC_WORDPRESS_API_URL?.replace('/wp-json', '') || '';

  const spaMode = appearance?.spaMode === true;
  const useSmoothScroll = !spaMode && appearance?.smoothScroll !== false;
  const useScrollProgress = !spaMode && appearance?.scrollProgress !== false;
  const useParallax = !spaMode;
  const showChatBot = Boolean(chatBotConfig?.enabled);

  const pageShell = (
    <BodyClass>
      <TooltipsProvider>
        <HeaderServer
          siteInfo={siteInfo ?? undefined}
          initialLocale={currentLocale}
          menusByLocale={mainMenu ? { [currentLocale]: mainMenu.items ?? [] } : undefined}
        />
        <main>{children}</main>
        {siteInfo && <Footer siteInfo={siteInfo} />}
        <GlobalUI appearance={appearance} showChatBot={showChatBot} />
      </TooltipsProvider>
    </BodyClass>
  );

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
            `,
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
              {useScrollProgress && <ScrollProgress />}
              {useSmoothScroll ? (
                <SmoothScroll enabled>
                  {useParallax && <ParallaxEffects />}
                  {pageShell}
                </SmoothScroll>
              ) : (
                <>
                  {useParallax && <ParallaxEffects />}
                  {pageShell}
                </>
              )}
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
