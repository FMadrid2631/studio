
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { AvailableNumbersList } from '@/components/raffle/AvailableNumbersList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Banknote, Info } from 'lucide-react'; // Added Banknote, Info
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Added Card components

export default function AvailableNumbersPage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, changeLocaleForRaffle } = useTranslations();

  const raffle = getRaffleById(raffleId);

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
        <Image src="https://placehold.co/300x200.png" alt={t('raffleDetailsPage.raffleNotFoundTitle')} width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound"/>
        <h2 className="text-2xl font-semibold mb-4">{t('raffleDetailsPage.raffleNotFoundTitle')}</h2>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('actions.backToHome')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')}
        </Button>
      </div>

      <h1 className="text-3xl font-bold text-center">{t('availableNumbersPage.title', { raffleName: raffle.name })}</h1>
      
      <ScrollArea className="h-96 border rounded-md">
        <AvailableNumbersList
          numbers={raffle.numbers}
          currencySymbol={raffle.country.currencySymbol}
          currencyCode={raffle.country.currencyCode}
          numberValue={raffle.numberValue}
        />
      </ScrollArea>

      {raffle.bankDetails && (
        <Card className="mt-6 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-primary flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              {t('purchaseForm.bankTransferDetails.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {raffle.bankDetails.bankName && <p><strong>{t('configureForm.labels.bankName')}:</strong> {raffle.bankDetails.bankName}</p>}
            {raffle.bankDetails.accountHolderName && <p><strong>{t('configureForm.labels.accountHolderName')}:</strong> {raffle.bankDetails.accountHolderName}</p>}
            {raffle.bankDetails.accountNumber && <p><strong>{t('configureForm.labels.accountNumber')}:</strong> {raffle.bankDetails.accountNumber}</p>}
            {raffle.bankDetails.accountType && <p><strong>{t('configureForm.labels.accountType')}:</strong> {raffle.bankDetails.accountType}</p>}
            {raffle.bankDetails.identificationNumber && <p><strong>{t('configureForm.labels.identificationNumber')}:</strong> {raffle.bankDetails.identificationNumber}</p>}
            
            {raffle.bankDetails.transferInstructions && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <p className="font-semibold flex items-center gap-1"><Info className="h-4 w-4 text-muted-foreground" />{t('configureForm.labels.transferInstructions')}:</p>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">{raffle.bankDetails.transferInstructions}</p>
              </div>
            )}

            {!(raffle.bankDetails.bankName ||
               raffle.bankDetails.accountHolderName ||
               raffle.bankDetails.accountNumber ||
               raffle.bankDetails.accountType ||
               raffle.bankDetails.identificationNumber ||
               raffle.bankDetails.transferInstructions) && (
              <p className="text-muted-foreground">{t('availableNumbersPage.noBankDetailsProvided')}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
