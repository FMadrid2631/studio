
// RaffleDraw.ts
'use server';

/**
 * @fileOverview Implements the raffle draw functionality to automatically select winners
 * from a provided list of eligible numbers.
 *
 * - automatedRaffleDraw - A function that handles the automated raffle draw process.
 * - AutomatedRaffleDrawInput - The input type for the automatedRaffleDraw function.
 * - AutomatedRaffleDrawOutput - The return type for the automatedRaffleDraw function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// The input 'availableNumbers' will be a list of numbers ELIGIBLE for the current draw,
// pre-filtered by the calling component.
const AutomatedRaffleDrawInputSchema = z.object({
  numberOfPrizes: z.number().describe('The number of prizes to draw (typically 1 for sequential draws).'),
  availableNumbers: z.array(z.number()).describe('An array of ELIGIBLE raffle number IDs to draw from.'),
});

export type AutomatedRaffleDrawInput = z.infer<typeof AutomatedRaffleDrawInputSchema>;

const AutomatedRaffleDrawOutputSchema = z.object({
  drawnNumbers: z.array(z.number()).describe('The randomly selected raffle numbers for the prizes.'),
  remainingNumbers: z.array(z.number()).describe('The remaining raffle numbers from the input list after the draw.'),
  allPrizesAwarded: z.boolean().describe('Indicates if all prizes requested were awarded (i.e., if enough numbers were available).'),
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
  async (input: AutomatedRaffleDrawInput): Promise<AutomatedRaffleDrawOutput> => {
    const {
      numberOfPrizes,
      availableNumbers, // These are the numbers eligible for *this* draw
    } = input;

    if (numberOfPrizes <= 0) {
      throw new Error('The number of prizes to draw must be positive.');
    }
    if (availableNumbers.length === 0 && numberOfPrizes > 0) {
        // This case should ideally be caught by the client, but good to have a check.
        return {
            drawnNumbers: [],
            remainingNumbers: [],
            allPrizesAwarded: false, // No prizes could be awarded as no numbers were available
        };
    }
    if (numberOfPrizes > availableNumbers.length) {
      // If more prizes are requested than available numbers, draw all available numbers.
      // The client typically calls this for 1 prize at a time.
      const drawnNumbers = [...availableNumbers];
      return {
        drawnNumbers,
        remainingNumbers: [],
        allPrizesAwarded: true, // All available numbers were drawn
      };
    }

    // Randomly select numbers for the prizes
    const drawnNumbers: number[] = [];
    // Clone the array to avoid mutating the input directly, though it's IDs.
    const remainingNumbersFromInput = [...availableNumbers]; 

    for (let i = 0; i < numberOfPrizes; i++) {
      if (remainingNumbersFromInput.length === 0) break; // Should not happen if previous checks are correct
      const randomIndex = Math.floor(Math.random() * remainingNumbersFromInput.length);
      drawnNumbers.push(remainingNumbersFromInput[randomIndex]);
      remainingNumbersFromInput.splice(randomIndex, 1);
    }

    // 'allPrizesAwarded' here means if all *requested* prizes in this call were awarded.
    // If numberOfPrizes was 1, and we drew 1, then allPrizesAwarded is true for this call.
    const allPrizesAwardedForThisCall = drawnNumbers.length === numberOfPrizes;

    return {
      drawnNumbers,
      remainingNumbers: remainingNumbersFromInput,
      allPrizesAwarded: allPrizesAwardedForThisCall,
    };
  }
);

    