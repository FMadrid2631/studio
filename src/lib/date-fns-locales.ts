
// src/lib/date-fns-locales.ts
import type { Locale as DateLocale } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale'; // Import locales you need

const dateLocales: Record<string, DateLocale> = {
  en: enUS,
  es: es,
  pt: ptBR,
  // Add other mappings as needed
};

export function getLocaleFromString(localeString: string | undefined): DateLocale {
  if (!localeString) return enUS; // Default to English if no string provided
  const baseLocale = localeString.split('-')[0]; // e.g., 'en-US' -> 'en'
  return dateLocales[baseLocale] || enUS; // Default to English US if specific locale not found
}
