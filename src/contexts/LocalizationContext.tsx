
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
// import { usePathname, useParams } from 'next/navigation'; // No longer needed here
// import { useRaffles } from './RaffleContext'; // No longer needed here
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
  const [locale, setLocaleState] = useState<SupportedLocale>(() => {
    if (typeof window !== 'undefined') {
      const storedLocale = localStorage.getItem(LOCAL_STORAGE_LOCALE_KEY) as SupportedLocale;
      if (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) {
        return storedLocale;
      }
    }
    return 'en'; // Default to English
  });
  
  const [loadedTranslations, setLoadedTranslations] = useState<Record<string, any>>(() => translationsData[locale] || translationsData.en);

  // const pathname = usePathname(); // Removed
  // const params = useParams(); // Removed
  // const { getRaffleById } = useRaffles(); // Removed

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
        newLocaleKey = 'en'; // Fallback if locale for country not supported
      }
    } else {
      // Fallback to localStorage or 'en' if no country code (e.g., on global pages)
      const storedLocale = localStorage.getItem(LOCAL_STORAGE_LOCALE_KEY) as SupportedLocale;
      newLocaleKey = (storedLocale && SUPPORTED_LOCALES.includes(storedLocale)) ? storedLocale : 'en';
    }
    persistLocale(newLocaleKey);
  }, []); // Empty dependency array ensures persistLocale refers to the correct one
  
  // Removed the useEffect that depended on pathname, params, getRaffleById, locale
  // as its logic was commented out and page-level effects are more explicit.

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
        let fallbackResult = translationsData.en; // Fallback to English
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
