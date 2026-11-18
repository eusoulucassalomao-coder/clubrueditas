export interface CookiePreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

const COOKIE_KEY = 'club_la_ruedita_preferences';

function readCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const item = document.cookie.split('; ').find((entry) => entry.startsWith(`${COOKIE_KEY}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_KEY.length + 1)) : null;
}

export function getCookiePreferences(): CookiePreferences | null {
  try {
    const raw = readCookie() || localStorage.getItem(COOKIE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      necessary: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      updatedAt: String(parsed.updatedAt || ''),
    };
  } catch {
    return null;
  }
}

export function saveCookiePreferences(value: { analytics: boolean; marketing: boolean }): CookiePreferences {
  const preferences: CookiePreferences = {
    necessary: true,
    analytics: value.analytics,
    marketing: value.marketing,
    updatedAt: new Date().toISOString(),
  };
  const encoded = encodeURIComponent(JSON.stringify(preferences));
  if (typeof document !== 'undefined') {
    document.cookie = `${COOKIE_KEY}=${encoded}; Path=/; Max-Age=15552000; SameSite=Lax; Secure`;
    localStorage.setItem(COOKIE_KEY, JSON.stringify(preferences));
  }
  return preferences;
}
