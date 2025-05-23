
'use client';

import type { RaffleNumber } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RaffleGridProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  currencyCode: string;
  numberValue: number;
  onNumberClick?: (numberId: number) => void;
  interactive?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function RaffleGrid({ numbers, currencySymbol, currencyCode, numberValue, onNumberClick, interactive = true, t }: RaffleGridProps) {

  const getStatusColor = (status: RaffleNumber['status'], paymentMethod?: RaffleNumber['paymentMethod']) => {
    if (status === 'Purchased') {
      if (paymentMethod === 'Cash') {
        return 'bg-sky-500 text-white'; // Blue for Cash
      }
      if (paymentMethod === 'Transfer') {
        return 'bg-emerald-500 text-white'; // Emerald for Transfer
      }
      return 'bg-green-600 text-white'; // Fallback for Purchased
    }
    if (status === 'PendingPayment') {
      return 'bg-yellow-400 text-black'; // Yellow for Pending
    }
    // Available
    return 'bg-card border hover:bg-accent/50';
  };

  const getTranslatedStatus = (status: RaffleNumber['status']) => t(`numberStatus.${status}`);
  const getTranslatedPaymentMethod = (method?: 'Cash' | 'Transfer' | 'Pending') => {
    if (!method) return t('shared.notApplicable');
    return t(`paymentMethodLabels.${method}`);
  };

  const formatPriceForTooltip = () => {
    // The locale for formatting is implicitly handled by toLocaleString using the user's system settings
    // or can be explicitly passed if 'locale' prop was available.
    // For now, undefined locale for toLocaleString uses default system locale.
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${numberValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${numberValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
                  getStatusColor(num.status, num.paymentMethod),
                  interactive && num.status === 'Available' ? 'cursor-pointer' : 'cursor-default opacity-80' // Added opacity for non-available
                )}
                onClick={() => interactive && num.status === 'Available' && onNumberClick?.(num.id)}
                role={interactive && num.status === 'Available' ? "button" : undefined}
                tabIndex={interactive && num.status === 'Available' ? 0 : -1}
                onKeyDown={(e) => {
                  if (interactive && num.status === 'Available' && (e.key === 'Enter' || e.key === ' ')) {
                    onNumberClick?.(num.id);
                  }
                }}
                aria-disabled={num.status !== 'Available'}
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
              <p>{t('raffleGrid.tooltip.price', { price: formatPriceForTooltip() })}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
