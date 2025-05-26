
'use client';

import type { Prize, Raffle, RaffleNumber } from '@/types';
import { automatedRaffleDraw } from '@/ai/flows/raffle-draw';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle, CalendarDays, Trophy, CreditCard } from 'lucide-react';
import { useTranslations } from '@/contexts/LocalizationContext';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';

interface RaffleDrawProps {
  raffle: Raffle;
}

export function RaffleDraw({ raffle: initialRaffle }: RaffleDrawProps) {
  const { getRaffleById, recordPrizeWinner, closeRaffle, isLoading: isRaffleContextLoading } = useRaffles();
  // Use getRaffleById to ensure we always have the latest state from the context
  const raffle = getRaffleById(initialRaffle.id) || initialRaffle;
  const { t, locale } = useTranslations();
  const { toast } = useToast();

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [lastDrawnWinners, setLastDrawnWinners] = useState<Prize[]>([]);
  
  const prizesToAward = useMemo(() => {
    if (!raffle || !raffle.prizes) return [];
    return raffle.prizes.filter(p => !p.winningNumber);
  }, [raffle]);

  const allPrizesAwardedOrRaffleClosed = useMemo(() => {
    if (!raffle || !raffle.prizes) return true; // If no raffle or prizes, consider it "closed" for drawing
    return raffle.status === 'Closed' || (raffle.prizes.length > 0 && raffle.prizes.every(p => !!p.winningNumber));
  }, [raffle]);

  const initialDisplay = useMemo(() => {
    const numDigits = String(raffle?.totalNumbers > 0 ? raffle.totalNumbers : 1).length;
    return '0'.repeat(numDigits);
  }, [raffle?.totalNumbers]);

  const [animatedDisplayNumber, setAnimatedDisplayNumber] = useState<string>(initialDisplay);
  const [activePrizeForLabel, setActivePrizeForLabel] = useState<Prize | null>(null);

  const dateLocaleForFormatting = getLocaleFromString(locale);

  const getTranslatedPaymentMethod = (method?: 'Cash' | 'Transfer' | 'Pending') => {
    if (!method) return t('shared.notApplicable');
    return t(`paymentMethodLabels.${method}`);
  };

  // Effect to handle the 10-second display of a winner
  useEffect(() => {
    let displayTimer: NodeJS.Timeout;

    if (lastDrawnWinners.length > 0 && lastDrawnWinners[0].winningNumber) {
      const justWonPrize = lastDrawnWinners[0];
      const winningNumStr = String(justWonPrize.winningNumber).padStart(String(raffle?.totalNumbers > 0 ? raffle.totalNumbers : 1).length, '0');
      
      setAnimatedDisplayNumber(winningNumStr);
      setActivePrizeForLabel(justWonPrize);

      displayTimer = setTimeout(() => {
        setAnimatedDisplayNumber(initialDisplay);
        setActivePrizeForLabel(null); 
      }, 10000);
    } else if (lastDrawnWinners.length === 0) {
      setAnimatedDisplayNumber(initialDisplay);
      setActivePrizeForLabel(null);
    }
    return () => clearTimeout(displayTimer);
  }, [lastDrawnWinners, raffle?.totalNumbers, initialDisplay]);

  // Effect to check for raffle completion and close it
  useEffect(() => {
    if (!raffle || raffle.status === 'Closed' || !raffle.prizes) {
      return;
    }
    // Check if all prizes are awarded based on the current raffle state from context
    const allPrizesNowAwarded = raffle.prizes.length > 0 && raffle.prizes.every(p => !!p.winningNumber);

    if (allPrizesNowAwarded) {
      closeRaffle(raffle.id); // This updates context, which in turn updates localStorage
      toast({
        title: t('drawPage.toast.raffleCompleteTitle'),
        description: t('drawPage.toast.raffleCompleteDescription'),
        duration: 5000
      });
    }
  }, [raffle, raffle.id, raffle.status, raffle.prizes, closeRaffle, t, toast]);


  const getDynamicDisplayLabel = () => {
    if (activePrizeForLabel) { 
      return t('drawPage.displayLabelWinnerForPrize', { prizeDescription: activePrizeForLabel.description });
    }
    // Determine next prize to draw based on descending order
    const nextPrizesToAwardSorted = [...prizesToAward].sort((a, b) => b.order - a.order);
    const nextPrize = nextPrizesToAwardSorted[0];
    if (nextPrize) {
      return t('drawPage.displayLabelDrawingForPrize', { prizeDescription: nextPrize.description });
    }
    return t('drawPage.displayLabelGeneral');
  };

  const handleDraw = async () => {
    if (allPrizesAwardedOrRaffleClosed) {
      toast({ title: t('drawPage.toast.infoTitle'), description: t('drawPage.toast.infoAllPrizesAwardedOrClosed'), variant: 'default' });
      return;
    }

    const currentPrizesToAwardSortedDesc = [...prizesToAward].sort((a, b) => b.order - a.order);
    const currentPrizeToAward = currentPrizesToAwardSortedDesc[0];

    if (!currentPrizeToAward) {
        toast({ title: t('drawPage.toast.infoTitle'), description: t('drawPage.toast.infoNoMorePrizesThisRound'), variant: 'default' });
        setIsDrawing(false);
        return;
    }

    setIsDrawing(true);
    setDrawError(null);

    const purchasedNumbers = raffle.numbers.filter(
      (n) => n.status === 'Purchased' && n.buyerName && n.buyerPhone && n.paymentMethod
    );

    const winningNumbersSoFar = raffle.prizes
      .map(p => p.winningNumber)
      .filter(n => n !== undefined) as number[];

    const eligibleNumbersToDrawFrom = purchasedNumbers.filter(n => !winningNumbersSoFar.includes(n.id));

    if (eligibleNumbersToDrawFrom.length === 0) {
      setDrawError(t('drawPage.errorNoEligibleNumbers'));
      setIsDrawing(false);
      return;
    }

    try {
      const result = await automatedRaffleDraw({
        numberOfPrizes: 1, 
        availableNumbers: eligibleNumbersToDrawFrom.map(n => n.id), 
      });

      if (result.drawnNumbers.length > 0) {
        const winningNumberId = result.drawnNumbers[0];
        const winnerDetails = purchasedNumbers.find(n => n.id === winningNumberId); 

        if (winnerDetails && winnerDetails.buyerName && winnerDetails.buyerPhone && winnerDetails.paymentMethod) {
          // recordPrizeWinner will update the context. The useEffect above will handle closing the raffle if all prizes are awarded.
          recordPrizeWinner(raffle.id, currentPrizeToAward.order, winningNumberId, winnerDetails.buyerName, winnerDetails.buyerPhone, winnerDetails.paymentMethod);
          
          const awardedPrizeDetails: Prize = { 
            ...currentPrizeToAward, 
            winningNumber: winningNumberId, 
            winnerName: winnerDetails.buyerName, 
            winnerPhone: winnerDetails.buyerPhone, 
            drawDate: new Date().toISOString(),
            winnerPaymentMethod: winnerDetails.paymentMethod 
          };
          setLastDrawnWinners([awardedPrizeDetails]); 
          toast({ 
            title: t('drawPage.toast.winnerDrawnTitle'), 
            description: t('drawPage.toast.winnerDrawnDescription', { winningNumber: String(winningNumberId).padStart(String(raffle?.totalNumbers > 0 ? raffle.totalNumbers : 1).length, '0'), prizeDescription: currentPrizeToAward.description, winnerName: winnerDetails.buyerName })
          });

        } else {
          setDrawError(t('drawPage.errorUnexpected')); 
          console.error("Winner details or payment method not found for drawn number:", winningNumberId);
        }
      } else {
        setDrawError(t('drawPage.errorDrawFailedNoNumberReturned'));
        toast({ title: t('drawPage.toast.drawErrorTitle'), description: t('drawPage.errorDrawFailedNoNumberReturned'), variant: 'destructive' });
      }
    } catch (error) {
      console.error("Error during raffle draw:", error);
      const errorMessage = error instanceof Error ? error.message : t('drawPage.errorUnexpected');
      setDrawError(errorMessage);
      toast({ title: t('drawPage.toast.drawErrorTitle'), description: errorMessage, variant: 'destructive' });
    } finally {
      setIsDrawing(false);
    }
  };

  if (isRaffleContextLoading && !raffle) {
     return <div className="flex justify-center items-center min-h-[20rem]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const nextPrizeToAwardForButtonSortedDesc = [...prizesToAward].sort((a, b) => b.order - a.order);
  const nextPrizeToAwardForButton = nextPrizeToAwardForButtonSortedDesc[0];
  const buttonDrawLabel = nextPrizeToAwardForButton?.description || t('drawPage.buttonDrawNext');
  
  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">{t('drawPage.title', { raffleName: raffle.name })}</CardTitle>
        <CardDescription>
          {allPrizesAwardedOrRaffleClosed
            ? t('drawPage.statusAllAwardedOrClosed')
            : t('drawPage.statusReadyToDraw', { prizeDescription: buttonDrawLabel })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {drawError && (
          <Alert variant="destructive">
            <AlertTitle>{t('configureForm.toast.errorTitle')}</AlertTitle>
            <AlertDescription>{drawError}</AlertDescription>
          </Alert>
        )}

        {allPrizesAwardedOrRaffleClosed ? (
          <Alert variant="default" className="bg-green-100 border-green-500 text-green-700">
             <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">{t('drawPage.raffleConcludedTitle')}</AlertTitle>
            <AlertDescription>{t('drawPage.raffleConcludedDescription')}</AlertDescription>
          </Alert>
        ) : (
          <div className="text-center">
            <div className="my-8 p-6 bg-muted/30 rounded-lg shadow-inner">
              <p className="text-lg font-medium text-muted-foreground mb-2">
                {getDynamicDisplayLabel()}
              </p>
              <p className="text-7xl font-bold text-primary tracking-wider">
                {animatedDisplayNumber}
              </p>
            </div>
            
            <Button onClick={handleDraw} disabled={isDrawing} size="lg" className="w-full md:w-auto">
              {isDrawing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Trophy className="mr-2 h-5 w-5" />
              )}
              {t('drawPage.buttonDrawFor', { prizeDescription: buttonDrawLabel })}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">{t('drawPage.drawOnePrizeHint')}</p>
          </div>
        )}

        {lastDrawnWinners.length > 0 && lastDrawnWinners[0].winningNumber && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-center">{t('drawPage.lastDrawWinnersTitle')}</h3>
            {lastDrawnWinners.map(prize => (
              <Card key={prize.id} className="bg-accent/30">
                <CardHeader>
                  <CardTitle className="text-accent-foreground">{prize.description}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p><strong>{t('drawPage.winnerLabel')}:</strong> {prize.winnerName}</p>
                  <p><strong>{t('drawPage.phoneLabel')}:</strong> {prize.winnerPhone}</p>
                  <p><strong>{t('drawPage.winningNumberLabelTitle')}:</strong> <span className="text-primary font-bold text-lg">{String(prize.winningNumber).padStart(String(raffle?.totalNumbers > 0 ? raffle.totalNumbers : 1).length, '0')}</span></p>
                  {prize.winnerPaymentMethod && (
                    <p className="flex items-center">
                      <CreditCard className="mr-1.5 h-4 w-4 text-muted-foreground" />
                      <strong>{t('drawPage.winnerPaymentMethodLabel')}:</strong>
                      <span className="ml-1">{getTranslatedPaymentMethod(prize.winnerPaymentMethod)}</span>
                    </p>
                  )}
                   {prize.drawDate && (
                    <p className="text-sm text-muted-foreground mt-1 flex items-center">
                      <CalendarDays className="mr-1.5 h-4 w-4" />
                      {t('drawPage.prizeDrawnOn', { date: format(new Date(prize.drawDate), 'Pp', { locale: dateLocaleForFormatting }) })}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-xl">{t('drawPage.allPrizesStatusTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
                {raffle.prizes && raffle.prizes.length === 0 ? (
                    <p className="text-muted-foreground">{t('drawPage.noPrizesDefinedInRaffle')}</p>
                ) : (
                    <ul className="space-y-3">
                        {raffle.prizes && raffle.prizes.sort((a,b) => a.order - b.order).map(prize => (
                            <li key={prize.id} className="p-3 border rounded-md bg-muted/20">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-semibold">{t('raffleDetailsPage.prizeItem', { order: prize.order })}: {prize.description}</p>
                                  </div>
                                </div>
                                {prize.winnerName && prize.winningNumber && prize.winnerPhone ? (
                                  <div className="mt-1 space-y-0.5">
                                    <p className="text-sm text-green-600">
                                      {t('drawPage.prizeWonByDetails', {
                                        winnerName: prize.winnerName, 
                                        winningNumber: String(prize.winningNumber).padStart(String(raffle?.totalNumbers > 0 ? raffle.totalNumbers : 1).length, '0'), 
                                        winnerPhone: prize.winnerPhone
                                      })}
                                    </p>
                                    {prize.winnerPaymentMethod && (
                                      <p className="text-sm text-muted-foreground flex items-center">
                                        <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                                        {t('drawPage.winnerPaymentMethodLabel')}: {getTranslatedPaymentMethod(prize.winnerPaymentMethod)}
                                      </p>
                                    )}
                                    {prize.drawDate && (
                                      <p className="text-xs text-muted-foreground flex items-center">
                                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                                        {t('drawPage.prizeDrawnOn', { date: format(new Date(prize.drawDate), 'Pp', { locale: dateLocaleForFormatting }) })}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-orange-500 italic mt-1">{t('drawPage.prizePendingDraw')}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>

      </CardContent>
      { !allPrizesAwardedOrRaffleClosed && 
        (nextPrizeToAwardForButtonSortedDesc.length > 1) && 
        (
         <CardFooter className="flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t('drawPage.morePrizesHint', { count: nextPrizeToAwardForButtonSortedDesc.length -1 })}
            </p>
         </CardFooter>
      )}
    </Card>
  );
}
    
