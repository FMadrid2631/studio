'use client';

import type { RaffleNumber } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface AvailableNumbersListProps {
  numbers: RaffleNumber[];
  currencySymbol: string;
  numberValue: number;
}

export function AvailableNumbersList({ numbers, currencySymbol, numberValue }: AvailableNumbersListProps) {
  const availableNumbers = numbers.filter(num => num.status === 'Available');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Available Numbers</CardTitle>
        <CardDescription>
          These numbers are still up for grabs! Each costs {numberValue} {currencySymbol}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {availableNumbers.length === 0 ? (
          <div className="text-center py-8">
            <Image src="https://placehold.co/200x150.png" alt="All sold out" width={200} height={150} className="mx-auto rounded-md shadow-sm mb-4" data-ai-hint="sold out tickets"/>
            <p className="text-xl font-semibold text-muted-foreground">All numbers have been sold or are pending payment!</p>
          </div>
        ) : (
          <ScrollArea className="h-72">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-1">
              {availableNumbers.map(num => (
                <Badge 
                  key={num.id} 
                  variant="outline" 
                  className="aspect-square flex items-center justify-center text-sm font-medium border-primary text-primary hover:bg-primary/10 transition-colors cursor-default"
                  title={`Number ${num.id}`}
                >
                  {num.id}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        )}
        <p className="mt-4 text-sm text-center text-muted-foreground">
          {availableNumbers.length} of {numbers.length} numbers available.
        </p>
      </CardContent>
    </Card>
  );
}
