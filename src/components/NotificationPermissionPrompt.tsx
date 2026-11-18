import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Language } from '../types';

type PermissionState = 'checking' | 'needs-gesture' | 'granted' | 'denied' | 'unsupported';

const COPY: Record<Language, {
  title: string;
  body: string;
  action: string;
  deniedTitle: string;
  deniedBody: string;
  unsupportedTitle: string;
  unsupportedBody: string;
}> = {
  es: {
    title: 'Activa las notificaciones',
    body: 'Activa las notificaciones de Club La Ruedita para recibir avisos importantes, novedades y beneficios.',
    action: 'Activar notificaciones',
    deniedTitle: 'Activa las notificaciones en la configuración del dispositivo',
    deniedBody: 'El permiso está bloqueado para esta aplicación. Abre la configuración del navegador o del dispositivo, permite las notificaciones y vuelve a abrir Club La Ruedita.',
    unsupportedTitle: 'Las notificaciones no están disponibles en este dispositivo',
    unsupportedBody: 'Abre Club La Ruedita desde un navegador compatible e instala la aplicación para activar las notificaciones.',
  },
  en: {
    title: 'Turn on notifications',
    body: 'Turn on Club La Ruedita notifications to receive important updates, news, and benefits.',
    action: 'Turn on notifications',
    deniedTitle: 'Turn on notifications in your device settings',
    deniedBody: 'Permission is blocked for this app. Open your browser or device settings, allow notifications, and reopen Club La Ruedita.',
    unsupportedTitle: 'Notifications are not available on this device',
    unsupportedBody: 'Open Club La Ruedita in a supported browser and install the app to enable notifications.',
  },
  pt: {
    title: 'Ative as notificações',
    body: 'Ative as notificações do Club La Ruedita para receber avisos importantes, novidades e benefícios.',
    action: 'Ativar notificações',
    deniedTitle: 'Ative as notificações nas configurações do dispositivo',
    deniedBody: 'A permissão está bloqueada para este aplicativo. Abra as configurações do navegador ou do dispositivo, permita as notificações e abra o Club La Ruedita novamente.',
    unsupportedTitle: 'As notificações não estão disponíveis neste dispositivo',
    unsupportedBody: 'Abra o Club La Ruedita em um navegador compatível e instale o aplicativo para ativar as notificações.',
  },
};

export function NotificationPermissionPrompt({
  isInstalled,
  language,
}: {
  isInstalled: boolean;
  language: Language;
}) {
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const copy = COPY[language];

  const syncPermission = useCallback(() => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      setPermissionState('granted');
    } else if (Notification.permission === 'denied') {
      setPermissionState('denied');
    } else {
      setPermissionState('needs-gesture');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setPermissionState('granted');
      } else if (result === 'denied') {
        setPermissionState('denied');
      } else {
        // Browsers may require a direct user gesture before showing the native prompt.
        setPermissionState('needs-gesture');
      }
    } catch {
      setPermissionState('needs-gesture');
    }
  }, []);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    if (!isInstalled && !standalone) return;

    if (!('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      setPermissionState('granted');
      return;
    }

    if (Notification.permission === 'denied') {
      setPermissionState('denied');
      return;
    }

    // First action on the first installed-app launch: request permission immediately.
    // If the browser blocks requests without a user gesture, the affirmative button
    // below retries the exact same native permission request from a user interaction.
    void requestPermission();
  }, [isInstalled, requestPermission]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncPermission();
    };
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncPermission]);

  if (!isInstalled && !window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }
  if (permissionState === 'checking' || permissionState === 'granted') return null;

  const blocked = permissionState === 'denied' || permissionState === 'unsupported';

  return (
    <section
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#FAF7F0] px-5 py-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-permission-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-[#E7DFCC] bg-white p-7 shadow-xl">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EAEFE5] text-[#4A5D3F]">
          <Bell className="h-7 w-7" />
        </span>
        <h1 id="notification-permission-title" className="font-display text-2xl font-semibold text-[#293622]">
          {blocked
            ? permissionState === 'denied' ? copy.deniedTitle : copy.unsupportedTitle
            : copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#5A6353]">
          {blocked
            ? permissionState === 'denied' ? copy.deniedBody : copy.unsupportedBody
            : copy.body}
        </p>
        {!blocked && (
          <button
            type="button"
            onClick={requestPermission}
            className="mt-7 min-h-[52px] w-full rounded-2xl bg-[#4A5D3F] px-5 py-3 text-base font-bold text-white transition-colors hover:bg-[#38492F]"
          >
            {copy.action}
          </button>
        )}
      </div>
    </section>
  );
}
