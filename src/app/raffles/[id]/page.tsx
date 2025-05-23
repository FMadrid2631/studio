
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleGrid } from '@/components/raffle/RaffleGrid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, ListChecks, Trophy, Settings, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { useEffect, useRef, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function RafflePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

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
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('actions.backToHome')}
          </Link>
        </Button>
      </div>
    );
  }
  
  const dateLocaleForFormatting = getLocaleFromString(locale);

  const handleNumberClick = (numberId: number) => {
    router.push(`/raffles/${raffleId}/purchase?selectedNumber=${numberId}`);
  };

  const handleExportImage = async () => {
    if (!gridRef.current || !raffle) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(gridRef.current, { 
        quality: 0.95, 
        backgroundColor: 'white'
      });
      const link = document.createElement('a');
      const sanitizedRaffleName = raffle.name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
      link.download = `rifa-${sanitizedRaffleName}-numeros.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: t('raffleDetailsPage.exportSuccessTitle'),
        description: t('raffleDetailsPage.exportSuccessDescription'),
      });
    } catch (error) {
      console.error('Error exporting image:', error);
      toast({
        title: t('raffleDetailsPage.exportErrorTitle'),
        description: t('raffleDetailsPage.exportErrorDescription'),
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };


  const purchasedCount = raffle.numbers.filter(n => n.status === 'Purchased' || n.status === 'PendingPayment').length;
  const progress = raffle.totalNumbers > 0 ? (purchasedCount / raffle.totalNumbers) * 100 : 0;
  const hasSoldNumbers = raffle.numbers.some(n => n.status !== 'Available');
  const canEditConfiguration = !hasSoldNumbers && raffle.status !== 'Closed';

  let formattedNumberValueWithSymbol;
  if (raffle.country.currencyCode === 'CLP') {
    formattedNumberValueWithSymbol = `${raffle.country.currencySymbol}${raffle.numberValue.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  } else {
    formattedNumberValueWithSymbol = `${raffle.country.currencySymbol}${raffle.numberValue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push('/')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.backToAllRaffles')}
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-primary">{raffle.name}</CardTitle>
                <CardDescription>
                  {t('raffleDetailsPage.drawDateLabel', { date: format(new Date(raffle.drawDate), 'PPP', { locale: dateLocaleForFormatting }) })}
                  {' | '}
                  <span className="font-bold text-lg">
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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <Button variant="outline" asChild disabled={raffle.status === 'Closed'}>
                <Link href={`/raffles/${raffle.id}/purchase`}>
                  <Edit className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.purchaseNumbersButton')}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/raffles/${raffle.id}/available`}>
                  <ListChecks className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.viewAvailableButton')}
                </Link>
              </Button>
              <Button variant="default" asChild disabled={raffle.status === 'Closed'}>
                <Link href={`/raffles/${raffle.id}/draw`}>
                  <Trophy className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.conductDrawButton')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-red-500 font-bold p-4 border border-red-500">DEBUG: IS THIS TEXT VISIBLE?</div>
            <Button 
              onClick={handleExportImage} 
              disabled={isExporting}
              variant="destructive" 
              className="mb-4 p-4 text-lg" 
            >
              {isExporting ? "GENERANDO..." : "BOTON EXPORTAR PRUEBA"}
            </Button>
            <div ref={gridRef}>
              <RaffleGrid 
                numbers={raffle.numbers} 
                currencySymbol={raffle.country.currencySymbol}
                currencyCode={raffle.country.currencyCode}
                numberValue={raffle.numberValue}
                onNumberClick={handleNumberClick}
                interactive={raffle.status === 'Open'}
                t={t}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('raffleDetailsPage.prizesListTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {raffle.prizes.sort((a,b) => a.order - b.order).map(prize => (
                <li key={prize.id} className="p-3 bg-muted/50 rounded-md">
                  <strong className="text-primary">{t('raffleDetailsPage.prizeItem', { order: prize.order })}:</strong> {prize.description}
                  {prize.winningNumber && prize.winnerName && (
                    <span className="ml-2 text-sm text-green-600 font-semibold">({t('raffleDetailsPage.prizeWonBy', { number: prize.winningNumber, name: prize.winnerName})})</span>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
