import { useCallback, useEffect, useState } from 'react';
import { DevicePlatform } from '../types';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function detectPlatform(): DevicePlatform {
  if (typeof window === 'undefined') return 'desktop';
  const ua = window.navigator.userAgent || '';
  const lower = ua.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(lower) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  if (isIOS) {
    const isCriOS = /crios|fxios|edgios|opios/.test(lower);
    const isSafari = /safari/.test(lower) && !isCriOS;
    return isSafari ? 'ios-safari' : 'ios-other';
  }

  if (/android/.test(lower)) {
    return 'android';
  }

  return 'desktop';
}

// Lembra que o app já foi instalado neste aparelho (no Android o navegador e o app compartilham este dado).
export const PWA_INSTALLED_KEY = 'club-la-ruedita-pwa-installed-v1';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  // true quando o app existe no aparelho mas esta página está aberta no navegador (aí sugerimos ABRIR, não instalar)
  const [hasApp, setHasApp] = useState(false);
  const [platform, setPlatform] = useState<DevicePlatform>(() => detectPlatform());

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    setIsInstalled(standalone);
    try {
      if (standalone) window.localStorage.setItem(PWA_INSTALLED_KEY, '1');
      else if (window.localStorage.getItem(PWA_INSTALLED_KEY) === '1') setHasApp(true);
    } catch { /* sem armazenamento: segue sem lembrar */ }
    const nav = window.navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> };
    nav.getInstalledRelatedApps?.().then((apps) => {
      if (apps.length > 0 && !standalone) setHasApp(true);
    }).catch(() => undefined);
    setPlatform(detectPlatform());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      try { window.localStorage.setItem(PWA_INSTALLED_KEY, '1'); } catch { /* ignore */ }
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    mediaQuery.addEventListener?.('change', handleDisplayModeChange);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt]);

  return {
    platform,
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    hasApp: hasApp && !isInstalled,
    install,
  };
}
