import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';

const DISMISSED_KEY = 'club_la_ruedita_notifications_prompt_dismissed';

export function NotificationPermissionPrompt({ isInstalled }: { isInstalled: boolean }) {
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');

  useEffect(() => {
    if (!isInstalled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setStatus('granted');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }
    if (localStorage.getItem(DISMISSED_KEY) !== '1') setVisible(true);
  }, [isInstalled]);

  const activate = async () => {
    if (!('Notification' in window)) {
      setStatus('unsupported');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setStatus(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'idle');
      if (permission !== 'default') setVisible(false);
    } catch {
      setStatus('unsupported');
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!isInstalled || !visible) return null;

  return (
    <section className="fixed z-[60] bottom-24 left-4 right-4 mx-auto max-w-md rounded-2xl border border-[#D8CEB8] bg-white p-4 shadow-xl" role="dialog" aria-label="Notificações do Club La Ruedita">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EAEFE5] text-[#4A5D3F]">
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-[#293622]">Ativar notificações?</h2>
          <p className="mt-1 text-sm leading-relaxed text-[#5A6353]">
            Permita que o Club La Ruedita envie notificações neste dispositivo.
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={activate} className="min-h-10 rounded-xl bg-[#4A5D3F] px-4 text-sm font-semibold text-white">
              Ativar notificações
            </button>
            <button type="button" onClick={dismiss} className="min-h-10 rounded-xl border border-[#D8CEB8] px-4 text-sm font-medium text-[#293622]">
              Agora não
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fechar" className="rounded-lg p-1 text-[#6B7365]">
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
