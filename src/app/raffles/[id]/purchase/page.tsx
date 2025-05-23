
'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { PurchaseForm } from '@/components/raffle/PurchaseForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';

export default function PurchasePage() {
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

  if (raffle.status === 'Closed') {
    return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt={t('purchaseForm.raffleClosedTitle')} width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="closed sign"/>
        <h2 className="text-2xl font-semibold mb-4">{t('purchaseForm.raffleClosedTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('purchaseForm.raffleClosedDescription')}</p>
        <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('purchaseForm.backToRaffleButton')}
        </Button>
      </div>
    );
  }


  return (
    <div>
      <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')} {/* Reusing key, consider specific one if needed */}
      </Button>
      <PurchaseForm raffle={raffle} />
    </div>
  );
}
