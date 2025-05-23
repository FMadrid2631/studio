
'use client';

import type { Prize, Raffle, RaffleNumber } from '@/types';
import { automatedRaffleDraw } from '@/ai/flows/raffle-draw';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, CheckCircle } from 'lucide-react';
import { Trophy } from 'lucide-react'; // Corrected import
import Image from 'next/image';
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
  const allPrizesAwarded = prizesToAward.length === 0;

  const handleDraw = async () => {
    if (allPrizesAwarded || raffle.status === 'Closed') {
      toast({ title: t('drawPage.toast.infoTitle'), description: t('drawPage.toast.infoAllPrizesAwardedOrClosed'), variant: 'default' });
      return;
    }

    const currentPrizeToAward = prizesToAward[0];
    if (!currentPrizeToAward) {
        toast({ title: t('drawPage.toast.infoTitle'), description: t('drawPage.toast.infoNoMorePrizesThisRound'), variant: 'default' });
        return;
    }

    setIsDrawing(true);
    setDrawError(null);
    setLastDrawnWinners([]);

    const purchasedNumbers = raffle.numbers.filter(
      (n) => n.status === 'Purchased' && n.buyerName && n.buyerPhone
    );

    const winningNumbersSoFar = raffle.prizes.map(p => p.winningNumber).filter(n => n !== undefined) as number[];
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
        const winningNumber = result.drawnNumbers[0];
        const winnerDetails = purchasedNumbers.find(n => n.id === winningNumber);

        if (winnerDetails && winnerDetails.buyerName && winnerDetails.buyerPhone) {
          recordPrizeWinner(raffle.id, currentPrizeToAward.order, winningNumber, winnerDetails.buyerName, winnerDetails.buyerPhone);
          const awardedPrizeDetails = { ...currentPrizeToAward, winningNumber, winnerName: winnerDetails.buyerName, winnerPhone: winnerDetails.buyerPhone };
          setLastDrawnWinners([awardedPrizeDetails]);
          toast({ 
            title: t('drawPage.toast.winnerDrawnTitle'), 
            description: t('drawPage.toast.winnerDrawnDescription', { winningNumber: String(winningNumber), prizeDescription: currentPrizeToAward.description, winnerName: winnerDetails.buyerName })
          });

          if (prizesToAward.length === 1) {
            closeRaffle(raffle.id);
            toast({ 
              title: t('drawPage.toast.raffleCompleteTitle'), 
              description: t('drawPage.toast.raffleCompleteDescription'), 
              duration: 5000 
            });
          }
        } else {
          setDrawError(t('drawPage.errorUnexpected')); // Generic error if winner details not found (shouldn't happen)
        }
      } else {
        setDrawError(t('drawPage.errorDrawFailed'));
      }
    } catch (error) {
      console.error("Error during raffle draw:", error);
      const errorMessage = error instanceof Error ? error.message : t('drawPage.errorUnexpected');
      setDrawError(errorMessage);
      toast({ title: t('drawPage.toast.drawErrorTitle'), description: drawError || t('drawPage.toast.drawErrorDescriptionGeneric'), variant: 'destructive' });
    } finally {
      setIsDrawing(false);
    }
  };

  if (isRaffleContextLoading) {
     return <div className="flex justify-center items-center min-h-[20rem]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  const nextPrizeDescription = prizesToAward[0]?.description || t('drawPage.buttonDrawNext');

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">{t('drawPage.title', { raffleName: raffle.name })}</CardTitle>
        <CardDescription>
          {allPrizesAwarded || raffle.status === 'Closed' 
            ? t('drawPage.statusAllAwarded')
            : t('drawPage.statusReadyToDraw', { prizeDescription: nextPrizeDescription })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {drawError && (
          <Alert variant="destructive">
            <AlertTitle>{t('configureForm.toast.errorTitle')}</AlertTitle> {/* Re-use generic error title */}
            <AlertDescription>{drawError}</AlertDescription>
          </Alert>
        )}

        {allPrizesAwarded || raffle.status === 'Closed' ? (
          <Alert variant="default" className="bg-green-100 border-green-500 text-green-700">
             <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">{t('drawPage.raffleConcludedTitle')}</AlertTitle>
            <AlertDescription>{t('drawPage.raffleConcludedDescription')}</AlertDescription>
            <Image src="https://placehold.co/300x180.png" alt={t('drawPage.raffleConcludedTitle')} width={300} height={180} className="mt-4 mx-auto rounded-md" data-ai-hint="celebration party confetti" />
          </Alert>
        ) : (
          <div className="text-center">
             <Image src="https://placehold.co/300x180.png" alt="Raffle drum" width={300} height={180} className="mb-6 mx-auto rounded-md shadow-md" data-ai-hint="raffle drum lottery" />
            <Button onClick={handleDraw} disabled={isDrawing} size="lg" className="w-full md:w-auto">
              {isDrawing ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Trophy className="mr-2 h-5 w-5" />
              )}
              {t('drawPage.buttonDrawFor', { prizeDescription: nextPrizeDescription })}
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
                  <p><strong>{t('drawPage.winningNumberLabel')}:</strong> <span className="text-primary font-bold text-lg">{prize.winningNumber}</span></p>
                  <p><strong>{t('drawPage.winnerLabel')}:</strong> {prize.winnerName}</p>
                  <p><strong>{t('drawPage.phoneLabel')}:</strong> {prize.winnerPhone}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-xl">{t('drawPage.awardedPrizesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
                {raffle.prizes.filter(p => p.winningNumber).length === 0 ? (
                    <p className="text-muted-foreground">{t('drawPage.noPrizesAwardedYet')}</p>
                ) : (
                    <ul className="space-y-3">
                        {raffle.prizes.filter(p => p.winningNumber).sort((a,b) => a.order - b.order).map(prize => (
                            <li key={prize.id} className="p-3 border rounded-md bg-muted/20">
                                <p className="font-semibold">{prize.description}</p>
                                {prize.winnerName && prize.winningNumber && prize.winnerPhone && (
                                  <p className="text-sm">{t('drawPage.prizeWonByDetails', {winnerName: prize.winnerName, winningNumber: String(prize.winningNumber), winnerPhone: prize.winnerPhone})}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>

      </CardContent>
      {!(allPrizesAwarded || raffle.status === 'Closed') && prizesToAward.length > 1 && (
         <CardFooter className="flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {t('drawPage.morePrizesHint', { count: prizesToAward.length -1 })}
            </p>
         </CardFooter>
      )}
    </Card>
  );
}
