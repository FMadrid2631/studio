'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseFormInput, Raffle } from '@/types';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface PurchaseFormProps {
  raffle: Raffle;
}

const createPurchaseFormSchema = (availableNumbers: number[]) => z.object({
  buyerName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  buyerPhone: z.string().min(5, { message: 'Phone number seems too short.' }),
  selectedNumbers: z.array(z.number()).min(1, { message: 'Please select at least one number.' })
    .refine(numbers => numbers.every(num => availableNumbers.includes(num)), {
      message: "One or more selected numbers are not available."
    }),
  paymentMethod: z.enum(['Cash', 'Transfer', 'Pending'], { required_error: 'Payment method is required.' }),
});


export function PurchaseForm({ raffle }: PurchaseFormProps) {
  const { purchaseNumbers } = useRaffles();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [totalAmount, setTotalAmount] = useState(0);

  const availableRaffleNumbers = raffle.numbers.filter(n => n.status === 'Available').map(n => n.id);
  const purchaseFormSchema = createPurchaseFormSchema(availableRaffleNumbers);
  
  const form = useForm<PurchaseFormInput>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      buyerName: '',
      buyerPhone: '',
      selectedNumbers: [],
      paymentMethod: undefined,
    },
  });

  const selectedNumbersWatch = form.watch('selectedNumbers');

  useEffect(() => {
    const preSelectedNumber = searchParams.get('selectedNumber');
    if (preSelectedNumber && availableRaffleNumbers.includes(Number(preSelectedNumber))) {
      form.setValue('selectedNumbers', [Number(preSelectedNumber)]);
    }
  }, [searchParams, form, availableRaffleNumbers]);

  useEffect(() => {
    setTotalAmount(selectedNumbersWatch.length * raffle.numberValue);
  }, [selectedNumbersWatch, raffle.numberValue]);


  function onSubmit(data: PurchaseFormInput) {
    const success = purchaseNumbers(raffle.id, data.buyerName, data.buyerPhone, data.selectedNumbers, data.paymentMethod);
    if (success) {
      toast({ title: 'Success!', description: `${data.selectedNumbers.length} number(s) purchased for ${data.buyerName}.` });
      router.push(`/raffles/${raffle.id}`);
    } else {
      toast({ title: 'Error', description: 'Failed to purchase numbers. Some might have been taken.', variant: 'destructive' });
      // Optionally, re-fetch raffle data or update available numbers here
      form.resetField("selectedNumbers"); // Reset selection as it might be outdated
    }
  }

  return (
    <Card className="max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">Purchase Numbers for "{raffle.name}"</CardTitle>
        <CardDescription>Select your numbers and fill in your details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="buyerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buyerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1234567890" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="selectedNumbers"
              render={() => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>Select Numbers</FormLabel>
                    <FormDescription>
                      Choose your lucky numbers. {raffle.numberValue} {raffle.country.currencySymbol} each.
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="grid grid-cols-5 gap-2">
                    {availableRaffleNumbers.length === 0 ? <p className="col-span-full text-center text-muted-foreground">All numbers are sold out!</p> : 
                      availableRaffleNumbers.map((numberId) => (
                        <FormField
                          key={numberId}
                          control={form.control}
                          name="selectedNumbers"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={numberId}
                                className="flex flex-row items-center justify-center space-x-0 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    className="sr-only" // Hide actual checkbox, styling the label
                                    checked={field.value?.includes(numberId)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), numberId])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== numberId
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel 
                                  className={`flex items-center justify-center w-full aspect-square rounded-md border cursor-pointer transition-colors
                                    ${field.value?.includes(numberId) 
                                      ? 'bg-primary text-primary-foreground border-primary' 
                                      : 'bg-card hover:bg-accent/50'}`}
                                >
                                  {numberId}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Transfer">Transfer</SelectItem>
                      <SelectItem value="Pending">Pending Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedNumbersWatch.length > 0 && (
              <div className="p-4 bg-accent/30 rounded-md text-center">
                <p className="text-lg font-semibold">Total Amount: 
                  <Badge variant="secondary" className="ml-2 text-lg bg-primary text-primary-foreground">
                    {totalAmount.toFixed(2)} {raffle.country.currencySymbol}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  ({selectedNumbersWatch.length} number(s) x {raffle.numberValue} {raffle.country.currencySymbol})
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={availableRaffleNumbers.length === 0}>
              Purchase
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
