
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useRaffles } from '@/contexts/RaffleContext';
import { RaffleGrid } from '@/components/raffle/RaffleGrid';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit, Settings, Trophy, DollarSign, ListChecks, Share2, MessageSquare, Facebook, Instagram, Twitter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { useEffect, useState, useRef } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { RaffleNumber } from '@/types';


export default function RafflePage() {
  const params = useParams();
  const raffleId = params.id as string;
  const { getRaffleById, isLoading, updatePendingPayment } = useRaffles();
  const router = useRouter();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  const { toast } = useToast();

  const raffle = getRaffleById(raffleId);

  const [isProfitDialogOpen, setIsProfitDialogOpen] = useState(false);
  const [profitDetails, setProfitDetails] = useState<{
    totalSales: number;
    totalPrizeValue: number;
    netProfit: number;
    totalPendingSales: number;
  } | null>(null);

  const [isUpdatePaymentDialogOpen, setIsUpdatePaymentDialogOpen] = useState(false);
  const [selectedNumberForPaymentUpdate, setSelectedNumberForPaymentUpdate] = useState<RaffleNumber | null>(null);
  const [newPaymentMethod, setNewPaymentMethod] = useState<'Cash' | 'Transfer' | undefined>(undefined);

  const gridRef = useRef<HTMLDivElement>(null);
  const [shareUrl, setShareUrl] = useState('');


  useEffect(() => {
    if (raffle) {
      changeLocaleForRaffle(raffle.country.code);
      if (typeof window !== 'undefined') {
        setShareUrl(window.location.origin + `/raffles/${raffle.id}`);
      }
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
      </div>
    );
  }

  const dateLocaleForFormatting = getLocaleFromString(locale);

  const formatPrice = (value: number, currencySymbol: string, currencyCode: string) => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleNumberClick = (numberId: number) => {
    if (!raffle) return;
    const clickedNumber = raffle.numbers.find(n => n.id === numberId);
    if (!clickedNumber) return;

    if (clickedNumber.status === 'Available' && raffle.status === 'Open') {
      router.push(`/raffles/${raffle.id}/purchase?selectedNumber=${numberId}`);
    } else if (clickedNumber.status === 'PendingPayment' && raffle.status === 'Open') {
      setSelectedNumberForPaymentUpdate(clickedNumber);
      setNewPaymentMethod(undefined); // Reset selection
      setIsUpdatePaymentDialogOpen(true);
    }
    // If 'Purchased' or raffle is 'Closed', do nothing on click in the grid for now
  };
  
  const handleConfirmPaymentUpdate = () => {
    if (!raffle || !selectedNumberForPaymentUpdate || !newPaymentMethod) return;

    const success = updatePendingPayment(raffle.id, selectedNumberForPaymentUpdate.id, newPaymentMethod);
    if (success) {
      toast({
        title: t('raffleDetailsPage.updatePayment.successTitle'),
        description: t('raffleDetailsPage.updatePayment.successDescription', { numberId: selectedNumberForPaymentUpdate.id, method: t(`paymentMethodLabels.${newPaymentMethod}`) })
      });
    } else {
      toast({
        title: t('raffleDetailsPage.updatePayment.errorTitle'),
        description: t('raffleDetailsPage.updatePayment.errorDescription'),
        variant: 'destructive'
      });
    }
    setIsUpdatePaymentDialogOpen(false);
    setSelectedNumberForPaymentUpdate(null);
    setNewPaymentMethod(undefined);
  };


  const purchasedCount = raffle.numbers.filter(n => n.status === 'Purchased' || n.status === 'PendingPayment').length;
  const progress = raffle.totalNumbers > 0 ? (purchasedCount / raffle.totalNumbers) * 100 : 0;
  const hasSoldNumbers = raffle.numbers.some(n => n.status !== 'Available');
  const canEditConfiguration = !hasSoldNumbers && raffle.status !== 'Closed';

  let formattedNumberValueWithSymbol = formatPrice(raffle.numberValue, raffle.country.currencySymbol, raffle.country.currencyCode);

  const calculateAndShowProfit = () => {
    if (!raffle) return;

    const totalSales = raffle.numbers.reduce((sum, num) => {
      if (num.status === 'Purchased' && (num.paymentMethod === 'Cash' || num.paymentMethod === 'Transfer')) {
        return sum + raffle.numberValue;
      }
      return sum;
    }, 0);

    const totalPrizeValue = raffle.prizes.reduce((sum, prize) => {
      return sum + (prize.referenceValue || 0);
    }, 0);

    const netProfit = totalSales - totalPrizeValue;

    const totalPendingSales = raffle.numbers.reduce((sum, num) => {
      if (num.status === 'PendingPayment') {
        return sum + raffle.numberValue;
      }
      return sum;
    }, 0);

    setProfitDetails({
      totalSales,
      totalPrizeValue,
      netProfit,
      totalPendingSales
    });
    setIsProfitDialogOpen(true);
  };

  const handleSocialShare = (platform: 'whatsapp' | 'facebook' | 'x' | 'instagram') => {
    if (!raffle || !shareUrl) return;

    const raffleName = raffle.name;
    const encodedUrl = encodeURIComponent(shareUrl);
    // Use a generic text for sharing that doesn't imply the raffle is open or closed
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
            title: t('purchaseForm.toast.copiedErrorTitle'), // Assuming generic copy error toasts
            description: t('purchaseForm.toast.copiedErrorDescription'),
            variant: 'destructive',
          });
        });
        return; 
    }
    window.open(platformUrl, '_blank', 'noopener,noreferrer');
  };


  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-primary">{raffle.name}</CardTitle>
                <CardDescription>
                  {t('raffleDetailsPage.drawDateLabel', { date: format(new Date(raffle.drawDate), 'PPP', { locale: dateLocaleForFormatting }) })}
                  {' | '}
                  <span className="font-bold text-lg text-foreground">
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
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
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
              <Button variant="outline" asChild className="w-full">
                 <Link href={`/raffles/${raffle.id}/available`}>
                    <ListChecks className="mr-2 h-4 w-4" />
                    {t('homePage.availableButton')}
                 </Link>
              </Button>
              <Button variant="default" asChild disabled={raffle.status === 'Closed'} className="w-full">
                <Link href={`/raffles/${raffle.id}/draw`}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {t('raffleDetailsPage.conductDrawButton')}
                </Link>
              </Button>
              <Button variant="default" onClick={calculateAndShowProfit} className="w-full col-span-full sm:col-span-2 md:col-span-4">
                <DollarSign className="mr-2 h-4 w-4" />
                {t('raffleDetailsPage.viewProfitButton')}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6" ref={gridRef}>
            <RaffleGrid
              numbers={raffle.numbers}
              currencySymbol={raffle.country.currencySymbol}
              currencyCode={raffle.country.currencyCode}
              numberValue={raffle.numberValue}
              onNumberClick={handleNumberClick}
              interactive={raffle.status === 'Open'}
              t={t}
            />
          </CardContent>
        </Card>

        <div className="p-4 border rounded-md bg-muted/30 text-sm">
          <h4 className="font-semibold text-base mb-2">{t('raffleDetailsPage.legend.title')}</h4>
          <div className="flex flex-row flex-wrap gap-x-4 gap-y-2">
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm border bg-card"></div>
              <span>{t('raffleDetailsPage.legend.available')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-yellow-400"></div>
              <span>{t('raffleDetailsPage.legend.pendingPayment')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-sky-500"></div>
              <span>{t('raffleDetailsPage.legend.purchasedCash')}</span>
            </div>
            <div className="inline-flex items-center gap-2">
              <div className="h-4 w-4 rounded-sm bg-emerald-500"></div>
              <span>{t('raffleDetailsPage.legend.purchasedTransfer')}</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{t('raffleDetailsPage.prizesListTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {raffle.prizes.sort((a, b) => a.order - b.order).map(prize => (
                <li key={prize.id} className="p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <strong className="text-primary">{t('raffleDetailsPage.prizeItem', { order: prize.order })}:</strong> {prize.description}
                      {prize.winningNumber && prize.winnerName && (
                        <span className="ml-2 text-sm text-green-600 font-semibold">({t('raffleDetailsPage.prizeWonBy', { number: prize.winningNumber, name: prize.winnerName })})</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        <Card>
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
                  <Twitter className="h-5 w-5" /> {/* Replace with X/Twitter icon if available */}
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


        {profitDetails && (
          <AlertDialog open={isProfitDialogOpen} onOpenChange={setIsProfitDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('raffleDetailsPage.profitDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-2 mt-4 text-sm">
                    <div className="flex justify-between">
                      <span>{t('raffleDetailsPage.profitDialog.totalSales')}:</span>
                      <span className="font-semibold">{formatPrice(profitDetails.totalSales, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('raffleDetailsPage.profitDialog.totalPrizeValue')}:</span>
                      <span className="font-semibold">{formatPrice(profitDetails.totalPrizeValue, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    <hr className="my-2 border-border" />
                    <div className="flex justify-between text-base">
                      <span className="font-bold">{t('raffleDetailsPage.profitDialog.netProfit')}:</span>
                      <span className="font-bold text-primary">{formatPrice(profitDetails.netProfit, raffle.country.currencySymbol, raffle.country.currencyCode)}</span>
                    </div>
                    {profitDetails.totalPendingSales > 0 && (
                      <p className="text-xs text-muted-foreground mt-4 pt-2 border-t border-border/50">
                        {t('raffleDetailsPage.profitDialog.notePendingSales', {
                          amount: formatPrice(profitDetails.totalPendingSales, raffle.country.currencySymbol, raffle.country.currencyCode)
                        })}
                      </p>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction onClick={() => setIsProfitDialogOpen(false)}>{t('raffleDetailsPage.profitDialog.closeButton')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {selectedNumberForPaymentUpdate && (
          <AlertDialog open={isUpdatePaymentDialogOpen} onOpenChange={setIsUpdatePaymentDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t('raffleDetailsPage.updatePayment.dialogTitle', { numberId: selectedNumberForPaymentUpdate.id })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('raffleDetailsPage.updatePayment.dialogDescription', { 
                    buyerName: selectedNumberForPaymentUpdate.buyerName || 'N/A', 
                    buyerPhone: selectedNumberForPaymentUpdate.buyerPhone || 'N/A' 
                  })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="paymentMethodUpdate">{t('purchaseForm.labels.paymentMethod')}</Label>
                  <Select onValueChange={(value: 'Cash' | 'Transfer') => setNewPaymentMethod(value)} value={newPaymentMethod}>
                    <SelectTrigger id="paymentMethodUpdate">
                      <SelectValue placeholder={t('purchaseForm.placeholders.selectPaymentMethod')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">{t('paymentMethodLabels.Cash')}</SelectItem>
                      <SelectItem value="Transfer">{t('paymentMethodLabels.Transfer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setIsUpdatePaymentDialogOpen(false);
                  setSelectedNumberForPaymentUpdate(null);
                  setNewPaymentMethod(undefined);
                }}>{t('raffleDetailsPage.updatePayment.cancelButton')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmPaymentUpdate} disabled={!newPaymentMethod}>
                  {t('raffleDetailsPage.updatePayment.confirmButton')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

      </div>
    </TooltipProvider>
  );
}
    

    