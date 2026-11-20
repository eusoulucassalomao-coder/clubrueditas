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
    // Quem sabe se o app está instalado é o navegador (getInstalledRelatedApps). A marca guardada só vale quando o navegador não sabe responder,
    // porque ela fica para trás quando a pessoa desinstala o app.
    const rememberedByFlag = () => {
      try { return window.localStorage.getItem(PWA_INSTALLED_KEY) === '1'; } catch { return false; }
    };
    const nav = window.navigator as unknown as { getInstalledRelatedApps?: () => Promise<unknown[]> };
    if (standalone) {
      try { window.localStorage.setItem(PWA_INSTALLED_KEY, '1'); } catch { /* ignore */ }
    } else if (typeof nav.getInstalledRelatedApps === 'function') {
      nav.getInstalledRelatedApps().then((apps) => {
        const installed = apps.length > 0;
        setHasApp(installed);
        try {
          if (installed) window.localStorage.setItem(PWA_INSTALLED_KEY, '1');
          else window.localStorage.removeItem(PWA_INSTALLED_KEY);
        } catch { /* ignore */ }
      }).catch(() => setHasApp(rememberedByFlag()));
    } else if (rememberedByFlag()) {
      setHasApp(true);
    }
    setPlatform(detectPlatform());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // O navegador só oferece instalar quando o app NÃO está instalado: esquece a marca antiga.
      setHasApp(false);
      try { window.localStorage.removeItem(PWA_INSTALLED_KEY); } catch { /* ignore */ }
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

  // "Já não tenho o app": esquece a marca e volta a oferecer a instalação.
  const forgetApp = useCallback(() => {
    try { window.localStorage.removeItem(PWA_INSTALLED_KEY); } catch { /* ignore */ }
    setHasApp(false);
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
    forgetApp,
    install,
  };
}
