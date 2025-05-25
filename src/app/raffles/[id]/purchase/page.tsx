
'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { PurchaseForm } from '@/components/raffle/PurchaseForm';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, MessageSquare, Facebook, Instagram, Twitter, Share2, Banknote, Info, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

export default function PurchasePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);

  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (raffle) {
      changeLocaleForRaffle(raffle.country.code);
      if (typeof window !== 'undefined') {
        setShareUrl(window.location.origin + `/raffles/${raffle.id}`);
      }
    }
  }, [raffle, changeLocaleForRaffle]);

  const handleSocialShare = (platform: 'whatsapp' | 'facebook' | 'x' | 'instagram') => {
    if (!raffle || raffle.status === 'Closed' || !shareUrl) return;

    const raffleName = raffle.name;
    const encodedUrl = encodeURIComponent(shareUrl);
    const text = t('raffleDetailsPage.shareMessageText', { raffleName: raffleName, url: shareUrl });
    const encodedText = encodeURIComponent(text);

    let platformUrl = '';

    switch (platform) {
      case 'whatsapp':
        platformUrl = `https://wa.me/?text=${encodedText}`;
        break;
      case 'facebook':
        platformUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'x':
        platformUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(t('raffleDetailsPage.shareMessageTextShort', {raffleName: raffleName}))}`;
        break;
      case 'instagram':
        navigator.clipboard.writeText(shareUrl).then(() => {
          toast({
            title: t('raffleDetailsPage.shareLinkCopiedTitle'),
            description: t('raffleDetailsPage.shareLinkCopiedDescription', {url: shareUrl}),
          });
        }).catch(err => {
          console.error('Failed to copy link: ', err);
          toast({
            title: t('purchaseForm.toast.copiedErrorTitle'),
            description: t('purchaseForm.toast.copiedErrorDescription'),
            variant: 'destructive',
          });
        });
        return; 
    }
    window.open(platformUrl, '_blank', 'noopener,noreferrer');
  };


  if (isLoading && !raffle) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!raffle) {
     return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt={t('raffleDetailsPage.raffleNotFoundTitle')} width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound"/>
        <h2 className="text-2xl font-semibold mb-4">{t('raffleDetailsPage.raffleNotFoundTitle')}</h2>
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
    <TooltipProvider>
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')}
        </Button>
        <PurchaseForm raffle={raffle} />

        <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <Share2 className="mr-2 h-5 w-5 text-primary" />
                {t('raffleDetailsPage.shareSectionTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSocialShare('whatsapp')}
                    disabled={raffle.status === 'Closed' || !shareUrl}
                    aria-label={t('raffleDetailsPage.shareOnWhatsApp')}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('raffleDetailsPage.shareOnWhatsApp')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSocialShare('facebook')}
                    disabled={raffle.status === 'Closed' || !shareUrl}
                    aria-label={t('raffleDetailsPage.shareOnFacebook')}
                  >
                    <Facebook className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('raffleDetailsPage.shareOnFacebook')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSocialShare('x')}
                    disabled={raffle.status === 'Closed' || !shareUrl}
                    aria-label={t('raffleDetailsPage.shareOnX')}
                  >
                    <Twitter className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('raffleDetailsPage.shareOnX')}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleSocialShare('instagram')}
                    disabled={raffle.status === 'Closed' || !shareUrl}
                    aria-label={t('raffleDetailsPage.shareOnInstagram')}
                  >
                    <Instagram className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('raffleDetailsPage.shareOnInstagramTooltip')}</TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
      </div>
    </TooltipProvider>
  );
}

    