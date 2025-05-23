
'use client';

import type { RaffleNumber } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import React from 'react';

interface AvailableNumbersListProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  numberValue: number;
  currencyCode: string;
}

export const AvailableNumbersList = React.forwardRef<
  HTMLDivElement,
  AvailableNumbersListProps
>(({ numbers, currencySymbol, numberValue, currencyCode }, ref) => {
  const availableNumbers = numbers.filter(num => num.status === 'Available');
  const { t, locale } = useTranslations();

  const formatPrice = () => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const priceDisplay = formatPrice();

  return (
    <Card ref={ref} className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t('availableNumbersPage.listTitle')}</CardTitle>
        <CardDescription>
          {t('availableNumbersPage.listDescription', { price: priceDisplay })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableNumbers.length === 0 ? (
          <div className="text-center py-8">
            {/* Image component is removed from here if all numbers are sold */}
            <p className="text-xl font-semibold text-muted-foreground">{t('availableNumbersPage.allSoldOut')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
            {availableNumbers.map(num => (
              <Badge
                key={num.id}
                variant="outline"
                className="aspect-square flex items-center justify-center text-sm font-medium border-primary text-primary hover:bg-primary/10 transition-colors cursor-default"
                title={`Number ${num.id}`}
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
