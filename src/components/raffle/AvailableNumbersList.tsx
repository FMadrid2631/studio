
'use client';

import type { RaffleNumber } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// Image component is removed as per user request if all numbers are sold
// import Image from 'next/image';
// import { useTranslations } from '@/contexts/LocalizationContext'; // No longer needed directly if t is passed
import React from 'react';

interface AvailableNumbersListProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  numberValue: number;
  currencyCode: string;
  t: (key: string, params?: Record<string, string | number>) => string; // Added t as a prop
}

export const AvailableNumbersList = React.forwardRef<
  HTMLDivElement,
  AvailableNumbersListProps
>(({ numbers, currencySymbol, numberValue, currencyCode, t }, ref) => {
  const availableNumbers = numbers.filter(num => num.status === 'Available');
  // const { locale } = useTranslations(); // locale can be derived from t or passed if needed for formatting

  const formatPrice = (value: number, cSymbol: string, cCode: string) => {
    // Using a generic approach for locale, assuming t's locale is representative
    // For more precise locale formatting, 'locale' prop would be better
    const currentLocale = typeof navigator !== 'undefined' ? navigator.language : 'en'; 
    if (cCode === 'CLP') {
      return `${cSymbol}${value.toLocaleString(currentLocale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${cSymbol}${value.toLocaleString(currentLocale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const priceDisplay = formatPrice(numberValue, currencySymbol, currencyCode);

  return (
    <Card ref={ref} className="shadow-lg bg-white"> {/* Added bg-white for consistent export background */}
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t('availableNumbersPage.listTitle')}</CardTitle>
        <CardDescription>
          {t('availableNumbersPage.listDescription', { price: priceDisplay })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableNumbers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xl font-semibold text-muted-foreground">{t('availableNumbersPage.allSoldOut')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
            {availableNumbers.map(num => (
              <Badge
                key={num.id}
                variant="outline"
                className="aspect-square flex items-center justify-center text-sm font-medium border-primary text-primary hover:bg-primary/10 transition-colors cursor-default"
                title={`${t('raffleGrid.tooltip.number', {id: num.id})} (${t('numberStatus.Available')})`}
              >
                {num.id}
              </Badge>
            ))}
          </div>
        )}
        <p className="mt-4 text-sm text-center text-muted-foreground">
          {t('availableNumbersPage.countSummary', { availableCount: availableNumbers.length, totalCount: numbers.length })}
        </p>
      </CardContent>
    </Card>
  );
});

AvailableNumbersList.displayName = 'AvailableNumbersList';
