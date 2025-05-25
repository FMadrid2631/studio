
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { getLocaleFromCountryCode, type SupportedLocale, SUPPORTED_LOCALES } from '@/lib/locale-utils';

// Import locale files directly
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';
import ptTranslations from '@/locales/pt.json';

const LOCAL_STORAGE_LOCALE_KEY = 'rifaFacilApp_locale';

interface LocalizationContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  changeLocaleForRaffle: (countryCode: string | undefined) => void;
  supportedLocales: SupportedLocale[];
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const translationsData: Record<SupportedLocale, any> = {
  en: enTranslations,
  es: esTranslations,
  pt: ptTranslations,
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with a fixed default locale for consistent server/client initial render
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  
  const [loadedTranslations, setLoadedTranslations] = useState<Record<string, any>>(() => translationsData.en);

  // Effect to load locale from localStorage on client-side after mount
  useEffect(() => {
    const storedLocale = localStorage.getItem(LOCAL_STORAGE_LOCALE_KEY) as SupportedLocale;
    if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale) && storedLocale !== locale) {
      setLocaleState(storedLocale);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const persistLocale = (newLocale: SupportedLocale) => {
    if (SUPPORTED_LOCALES.includes(newLocale)) {
      localStorage.setItem(LOCAL_STORAGE_LOCALE_KEY, newLocale);
      setLocaleState(newLocale);
    }
  };

  const changeLocaleForRaffle = useCallback((countryCode: string | undefined) => {
    let newLocaleKey: SupportedLocale;
    if (countryCode) {
      newLocaleKey = getLocaleFromCountryCode(countryCode);
      if (!translationsData[newLocaleKey]) {
        newLocaleKey = 'en'; 
      }
    } else {
      const storedLocale = localStorage.getItem(LOCAL_STORAGE_LOCALE_KEY) as SupportedLocale;
      newLocaleKey = (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) ? storedLocale : 'en';
    }
    persistLocale(newLocaleKey);
  }, []); 
  
  useEffect(() => {
    setLoadedTranslations(translationsData[locale] || translationsData.en);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = loadedTranslations;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        let fallbackResult = translationsData.en; 
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
          if (fallbackResult === undefined) return key; 
        }
        result = fallbackResult;
        break;
      }
    }

    if (typeof result === 'string' && params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, result);
    }
    return typeof result === 'string' ? result : key;
  }, [loadedTranslations, locale]);

  const contextValue = useMemo(() => ({
    locale,
    setLocale: persistLocale,
    t,
    changeLocaleForRaffle,
    supportedLocales: SUPPORTED_LOCALES
  }), [locale, t, changeLocaleForRaffle]);

  return (
    <LocalizationContext.Provider value={contextValue}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslations = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a LocalizationProvider');
  }
  return context;
};
