import React, { useState } from 'react';
import { getCookiePreferences, saveCookiePreferences } from '../services/cookiePreferences';

interface CookiePreferencesProps {
  onMarketingChange: (allowed: boolean) => Promise<void>;
}

export const CookiePreferences: React.FC<CookiePreferencesProps> = ({ onMarketingChange }) => {
  const saved = getCookiePreferences();
  const [bannerOpen, setBannerOpen] = useState(!saved);
  const [panelOpen, setPanelOpen] = useState(false);
  const [analytics, setAnalytics] = useState(saved?.analytics ?? false);
  const [marketing, setMarketing] = useState(saved?.marketing ?? false);

  const save = async (next: { analytics: boolean; marketing: boolean }) => {
    saveCookiePreferences(next);
    setAnalytics(next.analytics);
    setMarketing(next.marketing);
    setBannerOpen(false);
    setPanelOpen(false);
    await onMarketingChange(next.marketing);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-3 left-3 z-30 rounded-full bg-white/95 border border-[#D8CEB8] px-3 py-2 text-[11px] font-medium text-[#4D5647] shadow-sm"
      >
        Preferencias de cookies
      </button>

      {bannerOpen && (
        <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl rounded-2xl border border-[#D8CEB8] bg-[#FAF7F0] p-4 shadow-xl">
          <p className="text-sm font-semibold text-[#293622]">Tu privacidad importa</p>
          <p className="mt-1 text-xs leading-relaxed text-[#5A6353]">
            Usamos cookies necesarias para que el Club funcione. Las preferencias de marketing y comunicaciones por WhatsApp son opcionales.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button onClick={() => void save({ analytics: false, marketing: false })} className="min-h-10 rounded-xl border border-[#D8CEB8] px-3 text-xs font-semibold text-[#293622]">Rechazar opcionales</button>
            <button onClick={() => setPanelOpen(true)} className="min-h-10 rounded-xl border border-[#D8CEB8] px-3 text-xs font-semibold text-[#293622]">Personalizar</button>
            <button onClick={() => void save({ analytics: true, marketing: true })} className="min-h-10 rounded-xl bg-[#4A5D3F] px-3 text-xs font-semibold text-white">Aceptar todas</button>
          </div>
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F281B]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="cookie-title">
          <div className="w-full max-w-md rounded-3xl border border-[#E7DFCC] bg-[#FAF7F0] p-6 shadow-2xl">
            <h2 id="cookie-title" className="font-display text-xl font-semibold text-[#293622]">Preferencias de cookies</h2>
            <p className="mt-2 text-sm text-[#5A6353]">Las cookies necesarias permanecen activas. Puedes cambiar las demás preferencias cuando quieras.</p>
            <div className="mt-5 space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                <span><b className="block text-sm text-[#293622]">Necesarias</b><small className="text-xs text-[#6B7365]">Funcionamiento y seguridad del Club.</small></span>
                <input type="checkbox" checked disabled />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                <span><b className="block text-sm text-[#293622]">Analíticas</b><small className="text-xs text-[#6B7365]">Medición del uso del sitio.</small></span>
                <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4">
                <span><b className="block text-sm text-[#293622]">Marketing y WhatsApp</b><small className="text-xs text-[#6B7365]">Campañas, novedades y promociones por WhatsApp.</small></span>
                <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setPanelOpen(false)} className="min-h-11 rounded-xl border border-[#D8CEB8] px-4 text-sm font-semibold text-[#293622]">Cancelar</button>
              <button onClick={() => void save({ analytics, marketing })} className="min-h-11 rounded-xl bg-[#4A5D3F] px-4 text-sm font-semibold text-white">Guardar preferencias</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
