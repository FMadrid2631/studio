
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { AvailableNumbersList } from '@/components/raffle/AvailableNumbersList';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Banknote, Info, Download, Loader2, MessageSquare, Facebook, Instagram, Twitter, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

export default function AvailableNumbersPage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading } = useRaffles();
  const router = useRouter();
  const { t, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);
  const [isExporting, setIsExporting] = useState(false);
  const exportTargetRef = useRef<HTMLDivElement>(null);
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

  const handleExportImage = async () => {
    if (!exportTargetRef.current || !raffle) {
      toast({
        title: t('raffleDetailsPage.exportErrorTitle'),
        description: t('raffleDetailsPage.exportErrorDescription'),
        variant: 'destructive',
      });
      return;
    }
    setIsExporting(true);

    try {
      const dataUrl = await toPng(exportTargetRef.current, {
        backgroundColor: '#ffffff', 
        height: exportTargetRef.current.scrollHeight,
        width: exportTargetRef.current.offsetWidth,
      });
      const link = document.createElement('a');
      link.download = `rifa-${raffle.name.replace(/\s+/g, '_').toLowerCase()}-disponibles_y_banco.png`;
      link.href = dataUrl;
      link.click();
      toast({
        title: t('raffleDetailsPage.exportSuccessTitle'),
        description: t('availableNumbersPage.exportAllSuccessDescription'),
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

  if (isLoading && !raffle) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (!raffle) {
    return (
      <div className="text-center py-10">
        <Image src="https://placehold.co/300x200.png" alt={t('raffleDetailsPage.raffleNotFoundTitle')} width={300} height={200} className="mx-auto rounded-md shadow-md mb-4" data-ai-hint="error notfound"/>
        <h2 className="text-2xl font-semibold mb-4">{t('raffleDetailsPage.raffleNotFoundTitle')}</h2>
        {/* Button to go home was here, removed as per request */}
      </div>
    );
  }

  const isRaffleClosed = raffle.status === 'Closed';

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
          <Button variant="outline" onClick={() => router.push(`/raffles/${raffleId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('availableNumbersPage.backToRaffleDetails')}
          </Button>
          <Button 
            onClick={handleExportImage} 
            disabled={isExporting || isRaffleClosed} 
            variant="outline"
            title={isRaffleClosed ? t('availableNumbersPage.exportDisabledRaffleClosedTooltip') : t('raffleDetailsPage.exportImageButton')}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {t('raffleDetailsPage.exportImageButton')}
          </Button>
        </div>
        
        <div ref={exportTargetRef} className="bg-white p-4 rounded-lg shadow"> {/* Wrapper for export */}
            <AvailableNumbersList
              numbers={raffle.numbers}
              currencySymbol={raffle.country.currencySymbol}
              currencyCode={raffle.country.currencyCode}
              numberValue={raffle.numberValue}
              t={t}
            />
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
        
        <ScrollArea className="h-auto max-h-[70vh] border rounded-md p-1 hidden"> {/* This ScrollArea is now hidden as exportTargetRef handles full content */}
          {/* Content is now directly in exportTargetRef */}
        </ScrollArea>


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
