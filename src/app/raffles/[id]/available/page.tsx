
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { AvailableNumbersList } from '@/components/raffle/AvailableNumbersList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Download, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import type { ScrollArea } from '@/components/ui/scroll-area'; // Importar el tipo de ScrollArea

export default function AvailableNumbersPage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);
  const scrollAreaRef = useRef<React.ElementRef<typeof ScrollArea>>(null); // Ref para el componente ScrollArea
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

  const handleExportImage = async () => {
    if (!scrollAreaRef.current) {
      console.error('ScrollArea ref is not available');
      toast({
        title: t('raffleDetailsPage.exportErrorTitle'),
        description: t('raffleDetailsPage.exportErrorDescription'), // Consider a more specific error
        variant: 'destructive',
      });
      return;
    }

    // Intentar encontrar el viewport dentro del ScrollArea
    const viewport = scrollAreaRef.current.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');

    if (!viewport) {
        console.error('ScrollArea viewport element not found');
        toast({
            title: t('raffleDetailsPage.exportErrorTitle'),
            description: "Could not find the scrollable content area to export.",
            variant: 'destructive',
        });
        return;
    }


    setIsExporting(true);
    try {
      const dataUrl = await toPng(viewport, { // Capturar el viewport
        quality: 0.95,
        backgroundColor: 'white',
        width: viewport.scrollWidth,     // Usar scrollWidth del viewport
        height: viewport.scrollHeight,  // Usar scrollHeight del viewport
        // pixelRatio: 1, // Puede ayudar con la calidad en algunos casos
      });
      const link = document.createElement('a');
      const sanitizedRaffleName = raffle.name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_').toLowerCase();
      link.download = `rifa-${sanitizedRaffleName}-numeros-disponibles.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        title: t('raffleDetailsPage.exportSuccessTitle'),
        description: t('raffleDetailsPage.exportAvailableSuccessDescription'),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')}
        </Button>
        <Button
            variant="default"
            onClick={handleExportImage}
            disabled={isExporting || raffle.numbers.filter(n=>n.status === 'Available').length === 0 }
          >
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            {t('raffleDetailsPage.exportImageButton')}
          </Button>
      </div>

      <h1 className="text-3xl font-bold text-center">{t('availableNumbersPage.title', { raffleName: raffle.name })}</h1>

      {/* El div que envolvía a AvailableNumbersList ya no necesita el ref, se pasa directamente a AvailableNumbersList */}
      <div>
        <AvailableNumbersList
          ref={scrollAreaRef} // Pasar el ref al componente AvailableNumbersList
          numbers={raffle.numbers}
          currencySymbol={raffle.country.currencySymbol}
          currencyCode={raffle.country.currencyCode}
          numberValue={raffle.numberValue}
        />
      </div>
    </div>
  );
}
