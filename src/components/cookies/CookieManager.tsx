'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useCookieAware } from '@/hooks/useCookieConsent'
import localesConfig from '@/i18n/locales.generated.json'

// Analytics (GA, Meta Pixel, etc.) are handled by the Analytics component
// in layout.tsx using real IDs from WordPress settings — not here.

// Handles functional cookies (user preferences, locale, etc.)
const FunctionalityManager = () => {
  const { shouldLoad } = useCookieAware('preferences', 'functionality')
  const pathname = usePathname()

  const segments = pathname.split('/').filter(Boolean)
  const currentLocale = localesConfig.supportedLocales.includes(segments[0])
    ? segments[0]
    : localesConfig.defaultLocale

  useEffect(() => {
    if (shouldLoad) {
      const userPreferences = {
        language: currentLocale,
      }
      localStorage.setItem('user_preferences', JSON.stringify(userPreferences))
    }
  }, [shouldLoad, currentLocale])

  return null
}

const CookieManager = () => {
  return <FunctionalityManager />
}

export default CookieManager