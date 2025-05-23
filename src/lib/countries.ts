import type { Country } from '@/types';

export const COUNTRIES: Country[] = [
  { name: "Argentina", code: "AR", currencyCode: "ARS", currencySymbol: "$" },
  { name: "Bolivia", code: "BO", currencyCode: "BOB", currencySymbol: "Bs." },
  { name: "Brazil", code: "BR", currencyCode: "BRL", currencySymbol: "R$" },
  { name: "Chile", code: "CL", currencyCode: "CLP", currencySymbol: "$" },
  { name: "Colombia", code: "CO", currencyCode: "COP", currencySymbol: "$" },
  { name: "Costa Rica", code: "CR", currencyCode: "CRC", currencySymbol: "₡" },
  { name: "Cuba", code: "CU", currencyCode: "CUP", currencySymbol: "$" },
  { name: "Dominican Republic", code: "DO", currencyCode: "DOP", currencySymbol: "RD$" },
  { name: "Ecuador", code: "EC", currencyCode: "USD", currencySymbol: "$" },
  { name: "El Salvador", code: "SV", currencyCode: "USD", currencySymbol: "$" },
  { name: "Guatemala", code: "GT", currencyCode: "GTQ", currencySymbol: "Q" },
  { name: "Honduras", code: "HN", currencyCode: "HNL", currencySymbol: "L" },
  { name: "Mexico", code: "MX", currencyCode: "MXN", currencySymbol: "$" },
  { name: "Nicaragua", code: "NI", currencyCode: "NIO", currencySymbol: "C$" },
  { name: "Panama", code: "PA", currencyCode: "PAB", currencySymbol: "B/." }, // Balboa, also uses USD
  { name: "Paraguay", code: "PY", currencyCode: "PYG", currencySymbol: "₲" },
  { name: "Peru", code: "PE", currencyCode: "PEN", currencySymbol: "S/" },
  { name: "Puerto Rico", code: "PR", currencyCode: "USD", currencySymbol: "$" },
  { name: "Spain", code: "ES", currencyCode: "EUR", currencySymbol: "€" },
  { name: "United States", code: "US", currencyCode: "USD", currencySymbol: "$" },
  { name: "Uruguay", code: "UY", currencyCode: "UYU", currencySymbol: "$U" },
  { name: "Venezuela", code: "VE", currencyCode: "VES", currencySymbol: "Bs.S" },
];

export const getCountryByCode = (code: string): Country | undefined => {
  return COUNTRIES.find(country => country.code === code);
};
