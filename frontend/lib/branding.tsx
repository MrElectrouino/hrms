import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { API_BASE_URL } from './api';

/** What the whole app needs to look branded. Public: the login page uses it before sign-in. */
export interface PublicBranding {
  appName: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  loginBrandingText: string | null;
  footerText: string | null;
  hasLogo: boolean;
  hasFavicon: boolean;
  /** Changes whenever branding is saved; used to bust image caches. */
  version: string;
}

const FALLBACK: PublicBranding = {
  appName: 'HRMS',
  primaryColor: null,
  secondaryColor: null,
  accentColor: null,
  loginBrandingText: null,
  footerText: null,
  hasLogo: false,
  hasFavicon: false,
  version: '0',
};

const BrandingContext = createContext<{ branding: PublicBranding; reload: () => Promise<void> }>({
  branding: FALLBACK,
  reload: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

export const brandLogoSrc = (b: PublicBranding) => `${API_BASE_URL}/branding/logo/file?v=${encodeURIComponent(b.version)}`;

/* ------------------------------------------------------------------ colour scale */

function parseHex(hex: string | null): [number, number, number] | null {
  if (!hex) return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** amount > 0 mixes toward white, < 0 toward black. */
function shade(rgb: [number, number, number], amount: number): [number, number, number] {
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return rgb.map((c) => Math.round(c + (target - c) * a)) as [number, number, number];
}

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return a.map((c, i) => Math.round(c + (b[i] - c) * t)) as [number, number, number];
}

/**
 * Builds the 50..900 scale used by the "blue" classes. The primary colour is the 600 shade,
 * the secondary colour is the 800 shade (hover / dark states), 700 sits between them.
 */
export function brandScale(primary: string | null, secondary: string | null): Record<string, string> | null {
  const p = parseHex(primary);
  if (!p) return null;
  const s = parseHex(secondary) ?? shade(p, -0.3);
  const scale: Record<string, [number, number, number]> = {
    '50': shade(p, 0.93),
    '100': shade(p, 0.85),
    '200': shade(p, 0.7),
    '300': shade(p, 0.5),
    '400': shade(p, 0.25),
    '500': shade(p, 0.1),
    '600': p,
    '700': mix(p, s, 0.5),
    '800': s,
    '900': shade(s, -0.3),
  };
  return Object.fromEntries(Object.entries(scale).map(([k, v]) => [k, v.join(' ')]));
}

/** Last branding seen in this browser. pages/_document.tsx applies it before the first paint. */
export const BRANDING_CACHE_KEY = 'hrms.branding';

interface BrandingCache {
  branding: PublicBranding;
  /** CSS custom properties to set on <html> (--brand-50 … --brand-accent). */
  vars: Record<string, string>;
  faviconHref: string | null;
}

function readCache(): BrandingCache | null {
  try {
    const raw = localStorage.getItem(BRANDING_CACHE_KEY);
    return raw ? (JSON.parse(raw) as BrandingCache) : null;
  } catch {
    return null;
  }
}

function writeCache(cache: BrandingCache) {
  try {
    localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage unavailable: branding just loads from the server each time
  }
}

// useLayoutEffect warns during server rendering; this runs it only in the browser.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function applyBranding(b: PublicBranding) {
  const root = document.documentElement;
  const scale = brandScale(b.primaryColor, b.secondaryColor);
  const vars: Record<string, string> = {};
  for (const step of ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']) {
    if (scale) vars[`--brand-${step}`] = scale[step];
    root.style[scale ? 'setProperty' : 'removeProperty'](`--brand-${step}`, scale ? scale[step] : '');
  }
  const accent = parseHex(b.accentColor);
  if (accent) vars['--brand-accent'] = accent.join(' ');
  if (accent) root.style.setProperty('--brand-accent', accent.join(' '));
  else root.style.removeProperty('--brand-accent');
  const faviconHref = b.hasFavicon ? `${API_BASE_URL}/branding/favicon/file?v=${encodeURIComponent(b.version)}` : null;
  writeCache({ branding: b, vars, faviconHref });

  document.title = b.appName;
  if (b.hasFavicon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `${API_BASE_URL}/branding/favicon/file?v=${encodeURIComponent(b.version)}`;
  }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<PublicBranding>(FALLBACK);

  const reload = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/branding/public`);
      if (!res.ok) return;
      const json = await res.json();
      const next = { ...FALLBACK, ...(json?.data ?? {}) } as PublicBranding;
      setBranding(next);
      applyBranding(next);
    } catch {
      // Branding is cosmetic: keep the built-in look if it cannot be loaded.
    }
  };

  // Show the last known branding straight away (before paint), then refresh it from the server.
  useIsoLayoutEffect(() => {
    const cached = readCache();
    if (cached) setBranding({ ...FALLBACK, ...cached.branding });
  }, []);

  useEffect(() => {
    reload();
  }, []);

  return <BrandingContext.Provider value={{ branding, reload }}>{children}</BrandingContext.Provider>;
}
