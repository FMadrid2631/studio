
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleConfigureForm } from '@/components/raffle/RaffleConfigureForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function EditRafflePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, changeLocaleForRaffle } = useTranslations();

  const raffle = getRaffleById(raffleId);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [disableReason, setDisableReason] = useState<string>('');

  // Effect to set locale based on raffle country
  useEffect(() => {
    if (raffle) {
      changeLocaleForRaffle(raffle.country.code);
    }
  }, [raffle, changeLocaleForRaffle]);

  // Effect to determine editability and set messages
  useEffect(() => {
    if (raffle) {
      const hasSoldNumbers = raffle.numbers.some(n => n.status !== 'Available');
      if (raffle.status === 'Closed') {
        setCanEdit(false);
        setDisableReason(t('editRafflePage.cannotEditDescriptionClosed'));
      } else if (hasSoldNumbers) {
        setCanEdit(false);
        setDisableReason(t('editRafflePage.cannotEditDescriptionSales'));
      } else {
        setCanEdit(true);
        setDisableReason(''); // Clear reason if editable
      }
    } else if (!isLoading) { // Raffle not found and not loading
        setCanEdit(false);
        setDisableReason(t('raffleDetailsPage.raffleNotFoundDescription'));
    }
  }, [raffle, isLoading, t]);

  if (isLoading || canEdit === null) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!canEdit) {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center justify-center">
            <AlertTriangle className="mr-2 h-6 w-6" /> 
            {t('editRafflePage.cannotEditTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Image 
            src="https://placehold.co/300x200.png" 
            alt={t('editRafflePage.cannotEditTitle')} 
            width={300} 
            height={200} 
            className="mx-auto rounded-md shadow-md mb-4" 
            data-ai-hint="restriction warning sign"
          />
          <p className="text-muted-foreground">{disableReason}</p>
          <Button onClick={() => router.push(raffle ? `/raffles/${raffleId}` : '/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            {raffle ? t('availableNumbersPage.backToRaffleDetails') : t('actions.backToHome')}
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Raffle exists and can be edited
  return (
    <div>
      <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')}
      </Button>
      {/* RaffleConfigureForm will handle its own title based on editMode */}
      <RaffleConfigureForm editingRaffle={raffle} />
    </div>
  );
}
