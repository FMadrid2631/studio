
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { AvailableNumbersList } from '@/components/raffle/AvailableNumbersList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect, useRef } from 'react';
// Removed: Download, Loader2, toPng, useToast, useState, exportTargetRef logic

import { ScrollArea } from '@/components/ui/scroll-area';

export default function AvailableNumbersPage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, changeLocaleForRaffle } = useTranslations();

  const raffle = getRaffleById(raffleId);
  // exportTargetRef is no longer needed here as export functionality is removed.
  // const exportTargetRef = useRef<HTMLDivElement>(null); 

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
        {/* Export button and related logic completely removed */}
      </div>

      <h1 className="text-3xl font-bold text-center">{t('availableNumbersPage.title', { raffleName: raffle.name })}</h1>
      
      <ScrollArea className="h-96 border rounded-md">
        <AvailableNumbersList
          // ref={exportTargetRef} // Ref no longer passed
          numbers={raffle.numbers}
          currencySymbol={raffle.country.currencySymbol}
          currencyCode={raffle.country.currencyCode}
          numberValue={raffle.numberValue}
        />
      </ScrollArea>
    </div>
  );
}
