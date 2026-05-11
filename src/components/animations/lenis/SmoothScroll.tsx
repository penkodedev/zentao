'use client';

import { ReactNode, useEffect } from 'react';
import Lenis from 'lenis';

/**
 * Smooth scrolling wrapper using Lenis
 * Provides momentum scrolling for a premium feel.
 * Also intercepts all anchor clicks (a[href*="#"]) globally
 * so hash links scroll smoothly instead of jumping.
 */
export default function SmoothScroll({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({
      duration: 2.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    // Expose lenis globally so NavMenu and other components can scroll without URL change
    (window as any).__lenis = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // Check if a cross-page hash scroll was requested (set by WpNavMenu from a sub-page)
    const scrollTarget = sessionStorage.getItem('scrollTarget');
    if (scrollTarget) {
      sessionStorage.removeItem('scrollTarget');
      setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) lenis.scrollTo(el, { offset: -100 });
      }, 400);
    }

    // Stop/start Lenis when modal-open class is toggled on body
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('lenis-stop')) {
        lenis.stop();
      } else {
        lenis.start();
      }
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    // Global anchor click interceptor — only intercepts when the target element
    // exists on the current page. If not found, lets the browser navigate normally.
    const handleAnchorClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href*="#"]');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      const hashIndex = href.indexOf('#');
      const hash = href.slice(hashIndex);

      if (hash === '#' || hash === '') return;

      const target = document.querySelector(hash);
      if (!target) return; // element not on this page — don't intercept, let browser navigate

      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -100 });
    };

    document.addEventListener('click', handleAnchorClick);

    return () => {
      (window as any).__lenis = null;
      document.removeEventListener('click', handleAnchorClick);
      observer.disconnect();
      lenis.destroy();
    };
  }, [enabled]);

  return <>{children}</>;
}
