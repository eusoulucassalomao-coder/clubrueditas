import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import intlTelInput from 'intl-tel-input';
import 'intl-tel-input/styles';
import { Language } from '../types';

export interface PhoneFieldHandle {
  /** Número só com dígitos e código do país, pronto para o WhatsApp; null se estiver inválido. */
  getDigits: () => Promise<string | null>;
}

/** Celulares da Argentina precisam do 9 depois do 54 para o WhatsApp (549...). */
export function normalizeWhatsapp(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (/^54\d{10}$/.test(digits) && !digits.startsWith('549')) return '549' + digits.slice(2);
  return digits;
}

type Iti = ReturnType<typeof intlTelInput>;
type TranslationModule = { countryTranslations?: object; interfaceTranslations?: object };

async function loadI18n(language: Language) {
  const loaders: Record<Language, () => Promise<TranslationModule>> = {
    es: () => import('intl-tel-input/i18n/es') as Promise<TranslationModule>,
    pt: () => import('intl-tel-input/i18n/pt') as Promise<TranslationModule>,
    en: () => import('intl-tel-input/i18n/en') as Promise<TranslationModule>,
  };
  const mod = await loaders[language]();
  return { ...(mod.countryTranslations ?? {}), ...(mod.interfaceTranslations ?? {}) };
}

interface PhoneFieldProps {
  id: string;
  language: Language;
  placeholder?: string;
  disabled?: boolean;
  /** Número digitado antes (para não perder ao trocar de tela). */
  initialNumber?: string;
  onNumberChange?: (e164: string) => void;
  invalid?: boolean;
}

export const PhoneField = forwardRef<PhoneFieldHandle, PhoneFieldProps>(function PhoneField(
  { id, language, placeholder, disabled, initialNumber, onNumberChange, invalid },
  ref
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itiRef = useRef<Iti | null>(null);
  const onChangeRef = useRef(onNumberChange);
  onChangeRef.current = onNumberChange;

  useImperativeHandle(ref, () => ({
    async getDigits() {
      const iti = itiRef.current;
      if (!iti) return null;
      try {
        await iti.promise;
      } catch {
        return null;
      }
      return iti.isValidNumber() ? normalizeWhatsapp(iti.getNumber()) : null;
    },
  }));

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    let cancelled = false;
    let iti: Iti | null = null;
    const notify = () => onChangeRef.current?.(iti?.getNumber() ?? '');

    void loadI18n(language).then((i18n) => {
      if (cancelled || !inputRef.current) return;
      iti = intlTelInput(inputRef.current, {
        initialCountry: 'ar',
        countryOrder: ['ar', 'br', 'py', 'uy', 'cl', 'us', 'es'],
        separateDialCode: true,
        nationalMode: true,
        dropdownContainer: document.body,
        i18n,
        loadUtils: () => import('intl-tel-input/utils'),
      } as Parameters<typeof intlTelInput>[1]);
      itiRef.current = iti;
      if (initialNumber) iti.setNumber(initialNumber);
      inputRef.current.addEventListener('input', notify);
      inputRef.current.addEventListener('countrychange', notify);
    });

    return () => {
      cancelled = true;
      input.removeEventListener('input', notify);
      input.removeEventListener('countrychange', notify);
      itiRef.current = null;
      iti?.destroy();
    };
    // recria só quando o idioma muda (os nomes dos países mudam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  return (
    <input
      id={id}
      ref={inputRef}
      type="tel"
      inputMode="tel"
      autoComplete="tel-national"
      placeholder={placeholder}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className="phone-field-input"
    />
  );
});
