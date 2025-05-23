
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleGrid } from '@/components/raffle/RaffleGrid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit, Settings, Trophy, DollarSign, ListChecks, Download } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { useEffect, useState, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RafflePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();

  const raffle = getRaffleById(raffleId);

  const [isProfitDialogOpen, setIsProfitDialogOpen] = useState(false);
  const [profitDetails, setProfitDetails] = useState<{
    totalSales: number;
    totalPrizeValue: number;
    netProfit: number;
    totalPendingSales: number;
  } | null>(null);

  useEffect(() => {
    if (raffle) {
      changeLocaleForRaffle(raffle.country.code);
    }
  }, [raffle, changeLocaleForRaffle]);


  if (isLoading && !raffle) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!raffle) {
    return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt={t('raffleDetailsPage.raffleNotFoundTitle')} width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound" />
        <h2 className="text-2xl font-semibold mb-4">{t('raffleDetailsPage.raffleNotFoundTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('raffleDetailsPage.raffleNotFoundDescription')}</p>
        {/* Button to go home was here, removed as per request */}
      </div>
    );
  }

  const dateLocaleForFormatting = getLocaleFromString(locale);

  const formatPrice = (value: number, currencySymbol: string, currencyCode: string) => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleNumberClick = (numberId: number) => {
    router.push(`/raffles/${raffleId}/purchase?selectedNumber=${numberId}`);
  };

  const purchasedCount = raffle.numbers.filter(n => n.status === 'Purchased' || n.status === 'PendingPayment').length;
  const progress = raffle.totalNumbers > 0 ? (purchasedCount / raffle.totalNumbers) * 100 : 0;
  const hasSoldNumbers = raffle.numbers.some(n => n.status !== 'Available');
  const canEditConfiguration = !hasSoldNumbers && raffle.status !== 'Closed';

  let formattedNumberValueWithSymbol = formatPrice(raffle.numberValue, raffle.country.currencySymbol, raffle.country.currencyCode);

  const calculateAndShowProfit = () => {
    if (!raffle) return;

    const totalSales = raffle.numbers.reduce((sum, num) => {
      if (num.status === 'Purchased' && (num.paymentMethod === 'Cash' || num.paymentMethod === 'Transfer')) {
        return sum + raffle.numberValue;
      }
      return sum;
    }, 0);

    const totalPrizeValue = raffle.prizes.reduce((sum, prize) => {
      return sum + (prize.referenceValue || 0);
    }, 0);

    const netProfit = totalSales - totalPrizeValue;

    const totalPendingSales = raffle.numbers.reduce((sum, num) => {
      if (num.status === 'PendingPayment') {
        return sum + raffle.numberValue;
      }
      return sum;
    }, 0);

    setProfitDetails({
      totalSales,
      totalPrizeValue,
      netProfit,
      totalPendingSales
    });
    setIsProfitDialogOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-primary">{raffle.name}</CardTitle>
                <CardDescription>
                  {t('raffleDetailsPage.drawDateLabel', { date: format(new Date(raffle.drawDate), 'PPP', { locale: dateLocaleForFormatting }) })}
                  {' | '}
                  <span className="font-bold text-lg text-foreground">
                    {formattedNumberValueWithSymbol}
                  </span>
                  {' '}
                  {t('raffleDetailsPage.pricePerNumberSuffix')}
                </CardDescription>
              </div>
              <Badge variant={raffle.status === 'Open' ? 'default' : 'secondary'} className={`text-lg px-4 py-2 ${raffle.status === 'Open' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {raffle.status === 'Open' ? t('homePage.raffleStatusOpen') : t('homePage.raffleStatusClosed')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-accent/30 p-3 rounded-md"><strong>{t('raffleDetailsPage.totalNumbersLabel')}:</strong> {raffle.totalNumbers}</div>
              <div className="bg-accent/30 p-3 rounded-md"><strong>{t('raffleDetailsPage.numbersSoldLabel')}:</strong> {purchasedCount}</div>
              <div className="bg-accent/30 p-3 rounded-md"><strong>{t('raffleDetailsPage.prizesLabel')}:</strong> {raffle.prizes.length}</div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span>{t('raffleDetailsPage.salesProgressLabel')}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <Button variant="outline" asChild={canEditConfiguration} disabled={!canEditConfiguration} className="w-full">
                      {canEditConfiguration ? (
                        <Link href={`/raffles/${raffle.id}/edit`}>
                          <Settings className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.configureButton')}
                        </Link>
                      ) : (
                        <span>
                          <Settings className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.configureButton')}
                        </span>
                      )}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canEditConfiguration && (
                  <TooltipContent>
                    <p>{t('raffleDetailsPage.configureDisabledTooltip')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
              <Button variant="outline" asChild disabled={raffle.status === 'Closed'} className="w-full">
                <Link href={`/raffles/${raffle.id}/purchase`}>
                  <Edit className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.purchaseNumbersButton')}
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href={`/raffles/${raffle.id}/available`}>
                  <ListChecks className="mr-2 h-4 w-4" />
                  {t('homePage.availableButton')}
                </Link>
              </Button>
              <Button variant="default" asChild disabled={raffle.status === 'Closed'} className="w-full">
                <Link href={`/raffles/${raffle.id}/draw`}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {t('raffleDetailsPage.conductDrawButton')}
                </Link>
              </Button>
              <Button variant="default" onClick={calculateAndShowProfit} className="w-full col-span-full sm:col-span-2 md:col-span-4">
                <DollarSign className="mr-2 h-4 w-4" />
                {t('raffleDetailsPage.viewProfitButton')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <RaffleGrid
              numbers={raffle.numbers}
              currencySymbol={raffle.country.currencySymbol}
              currencyCode={raffle.country.currencyCode}
              numberValue={raffle.numberValue}
              onNumberClick={handleNumberClick}
              interactive={raffle.status === 'Open'}
              t={t}
            />
          </CardContent>
        </Card>

        <div className="p-4 border rounded-md bg-muted/30 text-sm">
          <h4 className="font-semibold text-base mb-2">{t('raffleDetailsPage.legend.title')}</h4>
          <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm border bg-card"></div>
              <span>{t('raffleDetailsPage.legend.available')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-yellow-400"></div>
              <span>{t('raffleDetailsPage.legend.pendingPayment')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-sky-500"></div>
              <span>{t('raffleDetailsPage.legend.purchasedCash')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-emerald-500"></div>
              <span>{t('raffleDetailsPage.legend.purchasedTransfer')}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('raffleDetailsPage.prizesListTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {raffle.prizes.sort((a, b) => a.order - b.order).map(prize => (
                <li key={prize.id} className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-primary">{t('raffleDetailsPage.prizeItem', { order: prize.order })}:</strong> {prize.description}
                      {prize.winningNumber && prize.winnerName && (
                        <span className="ml-2 text-sm text-green-600 font-semibold">({t('raffleDetailsPage.prizeWonBy', { number: prize.winningNumber, name: prize.winnerName })})</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" /> {/* Replaced Share2 with ListChecks for generic share title */}
              {t('raffleDetailsPage.shareSectionTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {/* Share buttons remain here */}
          </CardContent>
        </Card>


        {profitDetails && (
          <AlertDialog open={isProfitDialogOpen} onOpenChange={setIsProfitDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('raffleDetailsPage.profitDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span>{t('raffleDetailsPage.profitDialog.totalSales')}:</span>
                      <span className="font-semibold">{formatPrice(profitDetails.totalSales, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('raffleDetailsPage.profitDialog.totalPrizeValue')}:</span>
                      <span className="font-semibold">{formatPrice(profitDetails.totalPrizeValue, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    <hr className="my-2 border-border" />
                    <div className="flex justify-between text-base">
                      <span className="font-bold">{t('raffleDetailsPage.profitDialog.netProfit')}:</span>
                      <span className="font-bold text-primary">{formatPrice(profitDetails.netProfit, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    {profitDetails.totalPendingSales > 0 && (
                      <p className="text-xs text-muted-foreground mt-4 pt-2 border-t border-border/50">
                        {t('raffleDetailsPage.profitDialog.notePendingSales', {
                          amount: formatPrice(profitDetails.totalPendingSales, raffle.country.currencySymbol, raffle.country.currencyCode)
                        })}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsProfitDialogOpen(false)}>{t('raffleDetailsPage.profitDialog.closeButton')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </TooltipProvider>
  );
}
    
