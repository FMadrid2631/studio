
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleGrid } from '@/components/raffle/RaffleGrid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Edit, Settings } from 'lucide-react'; // Removed Download, Loader2, Trophy
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { useEffect, useRef } from 'react'; // Removed useState
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// Removed: import { toPng } from 'html-to-image';
// Removed: import { useToast } from '@/hooks/use-toast';

export default function RafflePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  // Removed: const { toast } = useToast();

  const raffle = getRaffleById(raffleId);
  const gridRef = useRef<HTMLDivElement>(null); // This ref is for RaffleGrid, potentially for future use, but export moved
  // Removed: const [isExporting, setIsExporting] = useState(false);

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

  // Removed handleExportImage function

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
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3"> {/* Adjusted grid for 3 items */}
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
              {/* Export button removed from here */}
              <Button variant="default" asChild disabled={raffle.status === 'Closed'} className="w-full">
                <Link href={`/raffles/${raffle.id}/draw`}>
                   {/* Assuming Trophy icon is wanted here, if not it was removed in error by previous step from imports */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 lucide lucide-trophy"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
                  {t('raffleDetailsPage.conductDrawButton')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
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
}
