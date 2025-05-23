
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
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea for page display

export default function AvailableNumbersPage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);
  const exportTargetRef = useRef<HTMLDivElement>(null); // Ref for the AvailableNumbersList Card element
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
    const elementToCapture = exportTargetRef.current;
    if (!elementToCapture) {
      console.error('Element to capture ref is not available');
      toast({
        title: t('raffleDetailsPage.exportErrorTitle'),
        description: t('raffleDetailsPage.exportErrorDescription'),
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    try {
      // Use offsetWidth for width and scrollHeight for the full content height of the Card
      const dataUrl = await toPng(elementToCapture, {
        quality: 0.95,
        backgroundColor: 'white',
        width: elementToCapture.offsetWidth,
        height: elementToCapture.scrollHeight,
        // pixelRatio: window.devicePixelRatio || 1, // Consider device pixel ratio for quality
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
      
      {/* ScrollArea for display purposes on the page */}
      <ScrollArea className="h-96 border rounded-md"> {/* Adjust height as needed, e.g., h-96 or h-[calc(100vh-20rem)] */}
        <AvailableNumbersList
          ref={exportTargetRef} // Ref points to the Card inside AvailableNumbersList
          numbers={raffle.numbers}
          currencySymbol={raffle.country.currencySymbol}
          currencyCode={raffle.country.currencyCode}
          numberValue={raffle.numberValue}
        />
      </ScrollArea>
    </div>
  );
}
