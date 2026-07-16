// src/components/layout/header/HeaderServer.tsx

import { headers } from 'next/headers';
import Header from "./Header";
import type { SiteInfo, MenuItem } from "@/types/wordpressTypes";
import localesConfig from "@/i18n/locales.generated.json";
import { fetchMenuByLocation } from "@/api/wordpressApi";

interface HeaderServerProps {
  variant?: "default" | "home";
  menuVariant?: 'desktop' | 'mobile' | 'responsive';
  initialLocale?: string;
  siteInfo?: SiteInfo;
  menusByLocale?: Record<string, MenuItem[]>;
}

// Default fallback site info when WordPress is unavailable
const defaultSiteInfo: SiteInfo = {
  title: "Logo del sitio",
  description: "",
  back_url: "",
  front_url: "",
  light_logo: "",
  dark_logo: "",
  favicons: {
    icon_32: "",
    icon_180: "",
    icon_192: "",
    icon_512: "",
  },
  date_format: "",
  language: "",
  social: [],
  contact: [],
  analytics: {
    google_analytics_id: "",
    facebook_pixel_id: "",
    gtm_id: "",
    twitter_pixel_id: "",
  },
  i18n: {
    default_locale: localesConfig.defaultLocale,
    locales: localesConfig.supportedLocales,
  },
};

export default async function HeaderServer({
  variant = "default",
  menuVariant: menuVariantProp,
  initialLocale,
  siteInfo: siteInfoProp,
  menusByLocale: menusByLocaleProp,
}: HeaderServerProps) {
  const menuVariant = menuVariantProp || 'responsive';
  const siteInfo = siteInfoProp || defaultSiteInfo;

  const defaultLocale = siteInfo.i18n?.default_locale || localesConfig.defaultLocale;
  const locale = initialLocale || defaultLocale;
  const supportedLocales = siteInfo.i18n?.locales || localesConfig.supportedLocales;

  const menusByLocale: Record<string, MenuItem[]> = menusByLocaleProp && Object.keys(menusByLocaleProp).length > 0
    ? menusByLocaleProp
    : {};
  let megaMenuEnabled = false;

  if (Object.keys(menusByLocale).length === 0) {
    try {
      const menuPromises = supportedLocales.map(async (loc) => {
        const res = await fetchMenuByLocation('mainnav', loc);
        return { locale: loc, res };
      });
      const results = await Promise.all(menuPromises);
      results.forEach(({ locale: loc, res }) => {
        menusByLocale[loc] = res?.items ?? [];
        if (res?.mega_menu_enabled) megaMenuEnabled = true;
      });
    } catch {
      // Fallback: menus fetched client-side
    }
  }

  return (
    <Header 
      variant={variant}
      menuVariant={menuVariant}
      initialLocale={locale} 
      siteInfo={siteInfo}
      menusByLocale={menusByLocale}
      megaMenuEnabled={megaMenuEnabled}
    />
  );
}
