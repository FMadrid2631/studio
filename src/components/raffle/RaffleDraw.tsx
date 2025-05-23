'use client';

import type { Prize, Raffle, RaffleNumber } from '@/types';
import { automatedRaffleDraw } from '@/ai/flows/raffle-draw';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Repeat, Trophy, CheckCircle, Info } from 'lucide-react';
import Image from 'next/image';

interface RaffleDrawProps {
  raffle: Raffle;
}

export function RaffleDraw({ raffle: initialRaffle }: RaffleDrawProps) {
  const { getRaffleById, recordPrizeWinner, closeRaffle, isLoading: isRaffleContextLoading } = useRaffles();
  // Use getRaffleById to ensure we always have the latest raffle state from context
  const raffle = getRaffleById(initialRaffle.id) || initialRaffle;

  const { toast } = useToast();
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);
  const [lastDrawnWinners, setLastDrawnWinners] = useState<Prize[]>([]);
  
  const prizesToAward = raffle.prizes.filter(p => !p.winningNumber);
  const allPrizesAwarded = prizesToAward.length === 0;

  const handleDraw = async () => {
    if (allPrizesAwarded || raffle.status === 'Closed') {
      toast({ title: 'Info', description: 'All prizes have been awarded or the raffle is closed.', variant: 'default' });
      return;
    }

    const currentPrizeToAward = prizesToAward[0]; // Award one prize at a time
    if (!currentPrizeToAward) {
        toast({ title: 'Info', description: 'No more prizes to award in this round.', variant: 'default' });
        return;
    }

    setIsDrawing(true);
    setDrawError(null);
    setLastDrawnWinners([]);

    const purchasedNumbers = raffle.numbers.filter(
      (n) => n.status === 'Purchased' && n.buyerName && n.buyerPhone
    );

    // Filter out numbers that have already won any prize in this raffle
    const winningNumbersSoFar = raffle.prizes.map(p => p.winningNumber).filter(n => n !== undefined) as number[];
    const eligibleNumbersToDrawFrom = purchasedNumbers.filter(n => !winningNumbersSoFar.includes(n.id));


    if (eligibleNumbersToDrawFrom.length === 0) {
      setDrawError('No eligible purchased numbers available to draw from.');
      setIsDrawing(false);
      return;
    }

    try {
      const result = await automatedRaffleDraw({
        numberOfPrizes: 1, // Draw for one prize
        availableNumbers: eligibleNumbersToDrawFrom.map(n => n.id),
      });

      if (result.drawnNumbers.length > 0) {
        const winningNumber = result.drawnNumbers[0];
        const winnerDetails = purchasedNumbers.find(n => n.id === winningNumber);

        if (winnerDetails && winnerDetails.buyerName && winnerDetails.buyerPhone) {
          recordPrizeWinner(raffle.id, currentPrizeToAward.order, winningNumber, winnerDetails.buyerName, winnerDetails.buyerPhone);
          const awardedPrizeDetails = { ...currentPrizeToAward, winningNumber, winnerName: winnerDetails.buyerName, winnerPhone: winnerDetails.buyerPhone };
          setLastDrawnWinners([awardedPrizeDetails]);
          toast({ title: 'Winner Drawn!', description: `Number ${winningNumber} wins ${currentPrizeToAward.description}! Congratulations to ${winnerDetails.buyerName}!` });

          // Check if this was the last prize
          if (prizesToAward.length === 1) { // This means currentPrizeToAward was the last one
            closeRaffle(raffle.id);
            toast({ title: 'Raffle Complete!', description: 'All prizes have been awarded. The raffle is now closed.', duration: 5000 });
          }
        } else {
          setDrawError(`Winning number ${winningNumber} drawn, but buyer details not found. This should not happen.`);
        }
      } else {
        setDrawError('The draw did not return any winning numbers.');
      }
    } catch (error) {
      console.error("Error during raffle draw:", error);
      setDrawError(error instanceof Error ? error.message : 'An unexpected error occurred during the draw.');
      toast({ title: 'Draw Error', description: drawError || 'Failed to conduct draw.', variant: 'destructive' });
    } finally {
      setIsDrawing(false);
    }
  };

  if (isRaffleContextLoading) {
     return <div className="flex justify-center items-center min-h-[20rem]"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }


  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Conduct Draw for "{raffle.name}"</CardTitle>
        <CardDescription>
          {allPrizesAwarded || raffle.status === 'Closed' 
            ? 'All prizes have been awarded. This raffle is closed.' 
            : `Ready to draw for the next prize: ${prizesToAward[0]?.description || 'N/A'}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {drawError && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{drawError}</AlertDescription>
          </Alert>
        )}

        {allPrizesAwarded || raffle.status === 'Closed' ? (
          <Alert variant="default" className="bg-green-100 border-green-500 text-green-700">
             <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertTitle className="font-semibold">Raffle Concluded</AlertTitle>
            <AlertDescription>All prizes have been successfully awarded. The raffle is now officially closed. Congratulations to all the winners!</AlertDescription>
            <Image src="https://placehold.co/300x180.png" alt="Raffle closed success" width={300} height={180} className="mt-4 mx-auto rounded-md" data-ai-hint="celebration party confetti" />
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
              Draw for: {prizesToAward[0]?.description || 'Next Prize'}
            </Button>
            <p className="text-sm text-muted-foreground mt-2">Only one prize will be drawn per click.</p>
          </div>
        )}

        {lastDrawnWinners.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-xl font-semibold text-center">🎉 Last Draw Winner(s) 🎉</h3>
            {lastDrawnWinners.map(prize => (
              <Card key={prize.id} className="bg-accent/30">
                <CardHeader>
                  <CardTitle className="text-accent-foreground">{prize.description}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p><strong>Winning Number:</strong> <span className="text-primary font-bold text-lg">{prize.winningNumber}</span></p>
                  <p><strong>Winner:</strong> {prize.winnerName}</p>
                  <p><strong>Phone:</strong> {prize.winnerPhone}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        <Card className="mt-6">
            <CardHeader>
                <CardTitle className="text-xl">Awarded Prizes</CardTitle>
            </CardHeader>
            <CardContent>
                {raffle.prizes.filter(p => p.winningNumber).length === 0 ? (
                    <p className="text-muted-foreground">No prizes awarded yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {raffle.prizes.filter(p => p.winningNumber).sort((a,b) => a.order - b.order).map(prize => (
                            <li key={prize.id} className="p-3 border rounded-md bg-muted/20">
                                <p className="font-semibold">{prize.description}</p>
                                <p className="text-sm">Won by: <span className="text-primary">{prize.winnerName}</span> (Number: {prize.winningNumber}, Phone: {prize.winnerPhone})</p>
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
              {prizesToAward.length -1} more prize(s) to draw after this one.
            </p>
         </CardFooter>
      )}
    </Card>
  );
}
