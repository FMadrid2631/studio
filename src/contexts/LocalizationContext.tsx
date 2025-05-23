
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname, useParams } from 'next/navigation';
import { useRaffles } from './RaffleContext';
import { getLocaleFromCountryCode, type SupportedLocale } from '@/lib/locale-utils';

// Import locale files directly
import enTranslations from '@/locales/en.json';
import esTranslations from '@/locales/es.json';
// Import ptTranslations from '@/locales/pt.json'; // Example for Portuguese

interface LocalizationContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  changeLocaleForRaffle: (countryCode: string | undefined) => void;
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

const translationsData: Record<SupportedLocale, any> = {
  en: enTranslations,
  es: esTranslations,
  // pt: ptTranslations, // Example for Portuguese
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>('en'); // Default to English
  const [loadedTranslations, setLoadedTranslations] = useState<Record<string, any>>(translationsData.en);

  const pathname = usePathname();
  const params = useParams();
  const { getRaffleById } = useRaffles();

  const changeLocaleForRaffle = useCallback((countryCode: string | undefined) => {
    if (countryCode) {
      const newLocale = getLocaleFromCountryCode(countryCode);
      if (translationsData[newLocale]) {
        setLocaleState(newLocale);
      } else {
        setLocaleState('en'); // Fallback if locale for country not supported
      }
    } else {
      setLocaleState('en'); // Default if no country code
    }
  }, []);
  
  useEffect(() => {
    const raffleId = params.id as string;
    if (pathname.startsWith('/raffles/') && raffleId) {
      const raffle = getRaffleById(raffleId);
      if (raffle) {
        changeLocaleForRaffle(raffle.country.code);
      } else {
        changeLocaleForRaffle(undefined); // Fallback to default if raffle not found
      }
    } else {
       changeLocaleForRaffle(undefined); // Default for global pages
    }
  }, [pathname, params, getRaffleById, changeLocaleForRaffle]);


  useEffect(() => {
    setLoadedTranslations(translationsData[locale] || translationsData.en);
  }, [locale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let result = loadedTranslations;
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // Fallback to English if key not found in current locale
        let fallbackResult = translationsData.en;
        for (const fk of keys) {
          fallbackResult = fallbackResult?.[fk];
          if (fallbackResult === undefined) return key; // Return key if not found in English either
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
    setLocale: setLocaleState, // Allow direct setting for future language switcher
    t,
    changeLocaleForRaffle
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
