
export type SupportedLocale = 'en' | 'es' | 'pt'; // Add more as needed

const countryToLocaleMap: Record<string, SupportedLocale> = {
  AR: 'es', // Argentina
  BO: 'es', // Bolivia
  CL: 'es', // Chile
  CO: 'es', // Colombia
  CR: 'es', // Costa Rica
  CU: 'es', // Cuba
  DO: 'es', // Dominican Republic
  EC: 'es', // Ecuador
  SV: 'es', // El Salvador
  GT: 'es', // Guatemala
  HN: 'es', // Honduras
  MX: 'es', // Mexico
  NI: 'es', // Nicaragua
  PA: 'es', // Panama
  PY: 'es', // Paraguay
  PE: 'es', // Peru
  PR: 'es', // Puerto Rico
  ES: 'es', // Spain
  UY: 'es', // Uruguay
  VE: 'es', // Venezuela
  BR: 'pt', // Brazil
  US: 'en', // United States
  // Add other countries and their primary locales
};

export function getLocaleFromCountryCode(countryCode: string): SupportedLocale {
  return countryToLocaleMap[countryCode.toUpperCase()] || 'en'; // Default to English if not mapped
}

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'es', 'pt'];
