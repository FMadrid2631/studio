
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleGrid } from '@/components/raffle/RaffleGrid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, Settings, Trophy, ListChecks, Download } from 'lucide-react';
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
import { Loader2 } from 'lucide-react';


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

  const formatPrice = (value: number, currencySymbol: string, currencyCode: string) => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleNumberClick = (numberId: number) => {
    router.push(`/raffles/${raffleId}/purchase?selectedNumber=${numberId}`);
  };

  const handleExportImage = async () => {
    if (!gridRef.current) {
      toast({
        title: t('raffleDetailsPage.exportErrorTitle'),
        description: t('raffleDetailsPage.exportErrorDescription'),
        variant: 'destructive',
      });
      return;
    }
    setIsExporting(true);
    try {
      // Ensure the grid has loaded and has dimensions
      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay to help with rendering

      const dataUrl = await toPng(gridRef.current, { 
        backgroundColor: '#ffffff', // Set background to white for better contrast
        // Consider explicitly setting width/height if scrollHeight/Width are problematic
        // width: gridRef.current.scrollWidth,
        // height: gridRef.current.scrollHeight,
      });
      const link = document.createElement('a');
      link.download = `rifa-${raffle.name.replace(/\s+/g, '_').toLowerCase()}-numeros.png`;
      link.href = dataUrl;
      link.click();
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

  let formattedNumberValueWithSymbol = formatPrice(raffle.numberValue, raffle.country.currencySymbol, raffle.country.currencyCode);

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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full"> 
                    <Button variant="outline" asChild={canEditConfiguration} disabled={!canEditConfiguration} className="w-full">
                      {canEditConfiguration ? (
                        <Link href={`/raffles/${raffle.id}/edit`}>
                          <Settings className="mr-2 h-4 w-4" /> {t('raffleDetailsPage.configureButton')}
                        </Link>
                      ) : (
                        <span> {/* Span wrapper for disabled button tooltip */}
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
                  <ListChecks className="mr-2 h-4 w-4" /> {t('homePage.availableButton')}
                </Link>
              </Button>
              <Button variant="default" asChild disabled={raffle.status === 'Closed'} className="w-full">
                <Link href={`/raffles/${raffle.id}/draw`}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {t('raffleDetailsPage.conductDrawButton')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
             {/* Removed title "Raffle Grid" and export button from here */}
          </CardHeader>
          <CardContent className="pt-6">
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
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-primary">{t('raffleDetailsPage.prizeItem', { order: prize.order })}:</strong> {prize.description}
                      {prize.winningNumber && prize.winnerName && (
                        <span className="ml-2 text-sm text-green-600 font-semibold">({t('raffleDetailsPage.prizeWonBy', { number: prize.winningNumber, name: prize.winnerName})})</span>
                      )}
                    </div>
                    {/* Removed prize.referenceValue display from here */}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
