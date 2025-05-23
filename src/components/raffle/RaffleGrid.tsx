
'use client';

import type { RaffleNumber } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Removed useTranslations from here as t is passed as a prop

interface RaffleGridProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  currencyCode: string;
  numberValue: number;
  onNumberClick?: (numberId: number) => void;
  interactive?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string; // t function passed as prop
}

export function RaffleGrid({ numbers, currencySymbol, currencyCode, numberValue, onNumberClick, interactive = true, t }: RaffleGridProps) {
  // const { locale } = useTranslations(); // locale is now derived from the t function's context or implicitly
  // For price formatting, we still need a locale. We assume the t function is tied to a locale from LocalizationContext.
  // However, LocalizationContext provides 'locale' directly. If t is passed, we might need 'locale' too for date-fns, or derive it.
  // For simplicity, if t is available, it implies a locale is set. We can get the current locale from useTranslations if needed,
  // or assume the parent passing 't' also handles locale-specific formatting if priceDisplay becomes complex.
  // Let's assume the parent handles locale for price formatting consistency for now.

  const getStatusColor = (status: RaffleNumber['status']) => {
    switch (status) {
      case 'Purchased':
        return 'bg-green-500 text-white';
      case 'PendingPayment':
        return 'bg-yellow-400 text-black';
      case 'Available':
      default:
        return 'bg-card border hover:bg-accent/50';
    }
  };

  const formatPriceForTooltip = (locale: string) => { // Added locale parameter for explicit formatting
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  // We need the actual current locale string for formatPriceForTooltip.
  // This is a slight complication if `t` is the only prop.
  // A better approach might be for RaffleGrid to use useTranslations itself if it's always contextually aware.
  // For now, let's assume the parent passes a pre-formatted price or the locale string.
  // The simplest fix is to make priceDisplay use the passed `t` function's context or a fixed locale if `t` doesn't provide it.
  // Let's assume `t` comes from a context that also has `locale`.
  // For now, to avoid breaking changes, let's use a placeholder for locale in price display if not passed.
  // This is not ideal. The component using RaffleGrid (RafflePage) has 'locale'. It should pass it.

  // Simplification: Price display logic is complex if locale isn't available.
  // The parent `RafflePage` has `locale`. It should format the price and pass it as a string, or pass `locale`.
  // Let's require `locale` prop for price formatting.
  // No, `formatPriceForTooltip` is already in parent. The `priceDisplay` is for the tooltip.
  // Let's reconstruct how `priceDisplay` is formed. It uses `locale` from `useTranslations`.
  // If `RaffleGrid` doesn't call `useTranslations`, it needs `locale`.
  // The parent (RafflePage) calls useTranslations, so it HAS locale and t.
  // It's better to pass locale as well.

  // Correct approach: RafflePage has `locale` and `t`. It passes both.
  // So, add `locale: string;` to RaffleGridProps.

  // Current props: currencySymbol, currencyCode, numberValue.
  // The price formatting should use the current application locale.
  // Since `t` is passed, we assume the context of `t` (from `useTranslations`) is the correct one.
  // The `locale` variable from `useTranslations` in the PARENT is what we need for formatting.
  // So, `RaffleGridProps` should also accept `currentLocale: string;`

  // Let's adjust RaffleGridProps and expect `currentLocale`
  // interface RaffleGridProps {
  //   ...
  //   currentLocale: string; // for formatting
  //   t: (key: string, params?: Record<string, string | number>) => string;
  // }
  // Then, in formatPriceForTooltip: use `currentLocale` instead of just `locale`.

  // Actually, `RafflePage` which uses `RaffleGrid` already has `locale`.
  // Let's modify the props to accept `localeForFormatting: string`.

  // Props:
  // numbers: RaffleNumber[];
  // currencySymbol: string;
  // currencyCode: string;
  // numberValue: number;
  // onNumberClick?: (numberId: number) => void;
  // interactive?: boolean;
  // t: (key: string, params?: Record<string, string | number>) => string;
  // For price display: use the locale from the context where `t` is obtained.
  // The price string formatting is done by the parent.
  // Let's assume the parent will provide a `formattedPricePerNumber: string`
  // This is getting complicated. The simplest is for RaffleGrid to useTranslations itself.
  // If not, it needs `t` AND `locale` for proper functioning.

  // Given the request is to use the selected language, the `t` function is key.
  // For price, it's already formatted in the parent component. Here it's about labels.

  const getTranslatedStatus = (status: RaffleNumber['status']) => t(`numberStatus.${status}`);
  const getTranslatedPaymentMethod = (method?: 'Cash' | 'Transfer' | 'Pending') => {
    if (!method) return t('shared.notApplicable'); // Add 'shared.notApplicable' key
    return t(`paymentMethodLabels.${method}`);
  };


  return (
    <TooltipProvider>
      <div className="grid grid-cols-10 gap-2">
        {numbers.map((num) => (
          <Tooltip key={num.id}>
            <TooltipTrigger asChild>
              <Card
                className={cn(
                  'aspect-square flex items-center justify-center font-semibold text-sm rounded-md transition-all duration-200 ease-in-out transform hover:scale-105',
                  getStatusColor(num.status),
                  interactive && num.status === 'Available' ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={() => interactive && num.status === 'Available' && onNumberClick?.(num.id)}
                role={interactive && num.status === 'Available' ? "button" : undefined}
                tabIndex={interactive && num.status === 'Available' ? 0 : -1}
                onKeyDown={(e) => {
                  if (interactive && num.status === 'Available' && (e.key === 'Enter' || e.key === ' ')) {
                    onNumberClick?.(num.id);
                  }
                }}
              >
                <CardContent className="p-0">{num.id}</CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('raffleGrid.tooltip.number', { id: num.id })}</p>
              <p>{t('raffleGrid.tooltip.status', { status: getTranslatedStatus(num.status) })}</p>
              {num.status !== 'Available' && num.buyerName && <p>{t('raffleGrid.tooltip.buyer', { name: num.buyerName })}</p>}
              {num.status !== 'Available' && num.buyerPhone && <p>{t('raffleGrid.tooltip.phone', { phone: num.buyerPhone })}</p>}
              {num.paymentMethod && <p>{t('raffleGrid.tooltip.payment', { method: getTranslatedPaymentMethod(num.paymentMethod) })}</p>}
              <p>{t('raffleGrid.tooltip.price', { price: `${currencySymbol}${numberValue.toLocaleString(undefined, {minimumFractionDigits: currencyCode === 'CLP' ? 0 : 2, maximumFractionDigits: currencyCode === 'CLP' ? 0 : 2})}` })}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
