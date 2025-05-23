
'use client';

import type { Prize, Raffle, RaffleNumber } from '@/types';
import { automatedRaffleDraw } from '@/ai/flows/raffle-draw';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle } from 'lucide-react';
import { Trophy } from 'lucide-react';
import { useTranslations } from '@/contexts/LocalizationContext';

interface RaffleDrawProps {
  raffle: Raffle;
}

export function RaffleDraw({ raffle: initialRaffle }: RaffleDrawProps) {
  const { getRaffleById, recordPrizeWinner, closeRaffle, isLoading: isRaffleContextLoading } = useRaffles();
  const raffle = getRaffleById(initialRaffle.id) || initialRaffle;
  const { t } = useTranslations();
  const { toast } = useToast();

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [lastDrawnWinners, setLastDrawnWinners] = useState<Prize[]>([]);
  
  const prizesToAward = raffle.prizes.filter(p => !p.winningNumber);
  const allPrizesAwardedOrRaffleClosed = prizesToAward.length === 0 || raffle.status === 'Closed';

  const initialDisplay = useMemo(() => '0'.repeat(String(raffle.totalNumbers).length), [raffle.totalNumbers]);
  const [animatedDisplayNumber, setAnimatedDisplayNumber] = useState<string>(initialDisplay);
  const [activePrizeForLabel, setActivePrizeForLabel] = useState<Prize | null>(null);

  useEffect(() => {
    let displayTimer: NodeJS.Timeout;

    if (lastDrawnWinners.length > 0 && lastDrawnWinners[0].winningNumber) {
      const justWonPrize = lastDrawnWinners[0];
      const winningNumStr = String(justWonPrize.winningNumber).padStart(String(raffle.totalNumbers).length, '0');
      
      setAnimatedDisplayNumber(winningNumStr);
      setActivePrizeForLabel(justWonPrize);

      displayTimer = setTimeout(() => {
        setAnimatedDisplayNumber(initialDisplay);
        setActivePrizeForLabel(null);
      }, 10000); // 10 seconds
    } else if (lastDrawnWinners.length === 0) { 
      setAnimatedDisplayNumber(initialDisplay);
      setActivePrizeForLabel(null);
    }

    return () => clearTimeout(displayTimer);
  }, [lastDrawnWinners, raffle.totalNumbers, initialDisplay]);

  const getDynamicDisplayLabel = () => {
    if (activePrizeForLabel) { 
      return t('drawPage.displayLabelWinnerForPrize', { prizeDescription: activePrizeForLabel.description });
    }
    const nextPrize = prizesToAward.sort((a, b) => a.order - b.order)[0];
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

    const currentPrizeToAward = prizesToAward.sort((a, b) => a.order - b.order)[0];
    if (!currentPrizeToAward) {
        toast({ title: t('drawPage.toast.infoTitle'), description: t('drawPage.toast.infoNoMorePrizesThisRound'), variant: 'default' });
        setIsDrawing(false);
        return;
    }

    setIsDrawing(true);
    setDrawError(null);

    const purchasedNumbers = raffle.numbers.filter(
      (n) => n.status === 'Purchased' && n.buyerName && n.buyerPhone
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

        if (winnerDetails && winnerDetails.buyerName && winnerDetails.buyerPhone) {
          recordPrizeWinner(raffle.id, currentPrizeToAward.order, winningNumberId, winnerDetails.buyerName, winnerDetails.buyerPhone);
          
          const awardedPrizeDetails = { ...currentPrizeToAward, winningNumber: winningNumberId, winnerName: winnerDetails.buyerName, winnerPhone: winnerDetails.buyerPhone };
          setLastDrawnWinners([awardedPrizeDetails]); // This will trigger the useEffect for animation
          toast({ 
            title: t('drawPage.toast.winnerDrawnTitle'), 
            description: t('drawPage.toast.winnerDrawnDescription', { winningNumber: String(winningNumberId).padStart(String(raffle.totalNumbers).length, '0'), prizeDescription: currentPrizeToAward.description, winnerName: winnerDetails.buyerName })
          });

          const updatedRaffleState = getRaffleById(raffle.id);
          if (updatedRaffleState && updatedRaffleState.prizes.every(p => !!p.winningNumber)) {
            if (updatedRaffleState.status !== 'Closed') {
              closeRaffle(raffle.id);
              toast({ 
                title: t('drawPage.toast.raffleCompleteTitle'), 
                description: t('drawPage.toast.raffleCompleteDescription'), 
                duration: 5000 
              });
            }
          }
        } else {
          setDrawError(t('drawPage.errorUnexpected')); 
          console.error("Winner details not found for drawn number:", winningNumberId);
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

  const nextPrizeToAwardForButton = prizesToAward.sort((a, b) => a.order - b.order)[0];
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

        {lastDrawnWinners.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-center">{t('drawPage.lastDrawWinnersTitle')}</h3>
            {lastDrawnWinners.map(prize => (
              <Card key={prize.id} className="bg-accent/30">
                <CardHeader>
                  <CardTitle className="text-accent-foreground">{prize.description}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>{t('drawPage.winnerLabel')}:</strong> {prize.winnerName}</p>
                  <p><strong>{t('drawPage.phoneLabel')}:</strong> {prize.winnerPhone}</p>
                  <p><strong>{t('drawPage.winningNumberLabelTitle')}:</strong> <span className="text-primary font-bold text-lg">{String(prize.winningNumber).padStart(String(raffle.totalNumbers).length, '0')}</span></p>
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
                {raffle.prizes.length === 0 ? (
                    <p className="text-muted-foreground">{t('drawPage.noPrizesDefinedInRaffle')}</p>
                ) : (
                    <ul className="space-y-3">
                        {raffle.prizes.sort((a,b) => a.order - b.order).map(prize => (
                            <li key={prize.id} className="p-3 border rounded-md bg-muted/20">
                                <p className="font-semibold">{t('raffleDetailsPage.prizeItem', { order: prize.order })}: {prize.description}</p>
                                {prize.winnerName && prize.winningNumber && prize.winnerPhone ? (
                                  <div className="mt-1">
                                    <p className="text-sm text-green-600">
                                      {t('drawPage.prizeWonByDetails', {
                                        winnerName: prize.winnerName, 
                                        winningNumber: String(prize.winningNumber).padStart(String(raffle.totalNumbers).length, '0'), 
                                        winnerPhone: prize.winnerPhone
                                      })}
                                    </p>
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
      {!allPrizesAwardedOrRaffleClosed && prizesToAward.length > 1 && (
         <CardFooter className="flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t('drawPage.morePrizesHint', { count: prizesToAward.length -1 })}
            </p>
         </CardFooter>
      )}
    </Card>
  );
}
