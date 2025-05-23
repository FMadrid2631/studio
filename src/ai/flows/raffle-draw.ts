// RaffleDraw.ts
'use server';

/**
 * @fileOverview Implements the raffle draw functionality to automatically select winners.
 *
 * - automatedRaffleDraw - A function that handles the automated raffle draw process.
 * - AutomatedRaffleDrawInput - The input type for the automatedRaffleDraw function.
 * - AutomatedRaffleDrawOutput - The return type for the automatedRaffleDraw function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AutomatedRaffleDrawInputSchema = z.object({
  numberOfPrizes: z.number().describe('The number of prizes to draw.'),
  availableNumbers: z.array(z.number()).describe('An array of available raffle numbers.'),
});

export type AutomatedRaffleDrawInput = z.infer<typeof AutomatedRaffleDrawInputSchema>;

const AutomatedRaffleDrawOutputSchema = z.object({
  drawnNumbers: z.array(z.number()).describe('The randomly selected raffle numbers for the prizes.'),
  remainingNumbers: z.array(z.number()).describe('The remaining raffle numbers after the draw.'),
  allPrizesAwarded: z.boolean().describe('Indicates if all prizes have been awarded.'),
});

export type AutomatedRaffleDrawOutput = z.infer<typeof AutomatedRaffleDrawOutputSchema>;


export async function automatedRaffleDraw(input: AutomatedRaffleDrawInput): Promise<AutomatedRaffleDrawOutput> {
  return automatedRaffleDrawFlow(input);
}

const automatedRaffleDrawFlow = ai.defineFlow(
  {
    name: 'automatedRaffleDrawFlow',
    inputSchema: AutomatedRaffleDrawInputSchema,
    outputSchema: AutomatedRaffleDrawOutputSchema,
  },
  async input => {
    const {
      numberOfPrizes,
      availableNumbers,
    } = input;

    if (numberOfPrizes > availableNumbers.length) {
      throw new Error('The number of prizes exceeds the number of available raffle numbers.');
    }

    // Randomly select numbers for the prizes
    const drawnNumbers: number[] = [];
    const remainingNumbers = [...availableNumbers];

    for (let i = 0; i < numberOfPrizes; i++) {
      const randomIndex = Math.floor(Math.random() * remainingNumbers.length);
      drawnNumbers.push(remainingNumbers[randomIndex]);
      remainingNumbers.splice(randomIndex, 1);
    }

    const allPrizesAwarded = remainingNumbers.length === 0;

    return {
      drawnNumbers,
      remainingNumbers,
      allPrizesAwarded,
    };
  }
);
