
'use client';

import type { RaffleNumber } from '@/types';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from '@/contexts/LocalizationContext';

interface RaffleGridProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  currencyCode: string; // Added currencyCode
  numberValue: number;
  onNumberClick?: (numberId: number) => void;
  interactive?: boolean;
}

export function RaffleGrid({ numbers, currencySymbol, currencyCode, numberValue, onNumberClick, interactive = true }: RaffleGridProps) {
  const { locale } = useTranslations();
  
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

  const formatPriceForTooltip = () => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${numberValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  const priceDisplay = formatPriceForTooltip();

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
              <p>Number: {num.id}</p>
              <p>Status: {num.status}</p>
              {num.status !== 'Available' && num.buyerName && <p>Buyer: {num.buyerName}</p>}
              {num.status !== 'Available' && num.buyerPhone && <p>Phone: {num.buyerPhone}</p>}
              {num.paymentMethod && <p>Payment: {num.paymentMethod}</p>}
              <p>Price: {priceDisplay}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
