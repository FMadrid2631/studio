
'use client';
import { RaffleConfigureForm } from '@/components/raffle/RaffleConfigureForm';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect } from 'react';


export default function ConfigureRafflePage() {
  const { t, changeLocaleForRaffle } = useTranslations();

  // Reset locale to default when on configure page
  useEffect(() => {
    changeLocaleForRaffle(undefined);
  }, [changeLocaleForRaffle]);

  return (
    <div>
      {/* The form title is inside RaffleConfigureForm, page title could be set via document.title if needed */}
      <RaffleConfigureForm />
    </div>
  );
}
