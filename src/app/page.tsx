
'use client';

import Link from 'next/link';
import { useRaffles } from '@/contexts/RaffleContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Eye, Edit, ListChecks, Trophy, DollarSign, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { useEffect, useState } from 'react';
import type { Raffle } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function HomePage() {
  const { raffles, isLoading } = useRaffles();
  const { t, locale, changeLocaleForRaffle } = useTranslations();

  const [isProfitDialogOpen, setIsProfitDialogOpen] = useState(false);
  const [profitDetails, setProfitDetails] = useState<{
    totalSales: number;
    totalPrizeValue: number;
    netProfit: number;
  } | null>(null);
  const [currentRaffleForProfit, setCurrentRaffleForProfit] = useState<Raffle | null>(null);

  useEffect(() => {
    changeLocaleForRaffle(undefined);
  }, [changeLocaleForRaffle]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }
  
  const dateLocale = getLocaleFromString(locale);

  const formatPrice = (value: number, currencySymbol: string, currencyCode: string) => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateAndShowProfitForRaffle = (raffleToShow: Raffle) => {
    const totalSales = raffleToShow.numbers.reduce((sum, num) => {
      if (num.status === 'Purchased' && (num.paymentMethod === 'Cash' || num.paymentMethod === 'Transfer')) {
        return sum + raffleToShow.numberValue;
      }
      return sum;
    }, 0);

    const totalPrizeValue = raffleToShow.prizes.reduce((sum, prize) => {
      return sum + (prize.referenceValue || 0);
    }, 0);

    const netProfit = totalSales - totalPrizeValue;

    setProfitDetails({ totalSales, totalPrizeValue, netProfit });
    setCurrentRaffleForProfit(raffleToShow);
    setIsProfitDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <section className="text-center py-12 bg-gradient-to-r from-primary/10 via-background to-accent/10 rounded-lg shadow-md">
        <h1 className="text-5xl font-bold text-primary mb-4">{t('homePage.welcomeTitle')}</h1>
        <p className="text-xl text-muted-foreground mb-8">{t('homePage.welcomeSubtitle')}</p>
        <Button asChild size="lg">
          <Link href="/configure">
            <PlusCircle className="mr-2 h-5 w-5" /> {t('homePage.createNewRaffleButton')}
          </Link>
        </Button>
      </section>

      {raffles.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle className="text-2xl">{t('homePage.noRafflesTitle')}</CardTitle>
            <CardDescription>{t('homePage.noRafflesDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Image src="https://placehold.co/300x200.png" alt="No raffles placeholder" width={300} height={200} className="mx-auto rounded-md shadow-md" data-ai-hint="empty state illustration" />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {raffles.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((raffle) => (
            <Card key={raffle.id} className="flex flex-col hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-2xl text-primary">{raffle.name}</CardTitle>
                  <Badge variant={raffle.status === 'Open' ? 'default' : 'secondary'} className={raffle.status === 'Open' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}>
                    {raffle.status === 'Open' ? t('homePage.raffleStatusOpen') : t('homePage.raffleStatusClosed')}
                  </Badge>
                </div>
                <CardDescription>
                  {t('homePage.labels.totalNumbers', { count: raffle.totalNumbers })} | {t('homePage.labels.numberValueEach', { price: formatPrice(raffle.numberValue, raffle.country.currencySymbol, raffle.country.currencyCode) })}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm text-muted-foreground">{t('homePage.labels.country', { countryName: raffle.country.name })}</p>
                <p className="text-sm text-muted-foreground">{t('homePage.labels.prizes', { count: raffle.prizes.length })}</p>
                <p className="text-sm text-muted-foreground">{t('homePage.labels.drawDate', { date: format(new Date(raffle.drawDate), 'PPP', { locale: dateLocale }) })}</p>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2">
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/raffles/${raffle.id}`}>
                    <Eye className="mr-2 h-4 w-4" /> {t('homePage.viewGridButton')}
                  </Link>
                </Button>
                {raffle.status === 'Closed' ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Edit className="mr-2 h-4 w-4" /> {t('homePage.purchaseButton')}
                  </Button>
                ) : (
                  <Button variant="outline" asChild className="w-full">
                    <Link href={`/raffles/${raffle.id}/purchase`}>
                      <Edit className="mr-2 h-4 w-4" /> {t('homePage.purchaseButton')}
                    </Link>
                  </Button>
                )}
                <Button variant="outline" asChild className="w-full">
                  <Link href={`/raffles/${raffle.id}/available`}>
                    <ListChecks className="mr-2 h-4 w-4" /> {t('homePage.availableButton')}
                  </Link>
                </Button>
                <Button variant="default" asChild className="w-full" disabled={raffle.status === 'Closed'}>
                  <Link href={`/raffles/${raffle.id}/draw`}>
                    <Trophy className="mr-2 h-4 w-4" /> {t('homePage.drawButton')}
                  </Link>
                </Button>
                <Button variant="outline" className="w-full col-span-2 sm:col-span-1" onClick={() => calculateAndShowProfitForRaffle(raffle)}>
                  <DollarSign className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.viewProfitButton')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {profitDetails && currentRaffleForProfit && (
        <AlertDialog open={isProfitDialogOpen} onOpenChange={setIsProfitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('raffleDetailsPage.profitDialogTitle')}</AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-2 mt-4 text-sm">
                  <p>{t('configureForm.labels.raffleName')}: <span className="font-semibold">{currentRaffleForProfit.name}</span></p>
                  <div className="flex justify-between">
                    <span>{t('raffleDetailsPage.profitDialog.totalSales')}:</span>
                    <span className="font-semibold">{formatPrice(profitDetails.totalSales, currentRaffleForProfit.country.currencySymbol, currentRaffleForProfit.country.currencyCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('raffleDetailsPage.profitDialog.totalPrizeValue')}:</span>
                    <span className="font-semibold">{formatPrice(profitDetails.totalPrizeValue, currentRaffleForProfit.country.currencySymbol, currentRaffleForProfit.country.currencyCode)}</span>
                  </div>
                  <hr className="my-2 border-border" />
                  <div className="flex justify-between text-base">
                    <span className="font-bold">{t('raffleDetailsPage.profitDialog.netProfit')}:</span>
                    <span className="font-bold text-primary">{formatPrice(profitDetails.netProfit, currentRaffleForProfit.country.currencySymbol, currentRaffleForProfit.country.currencyCode)}</span>
                  </div>
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
  );
}
