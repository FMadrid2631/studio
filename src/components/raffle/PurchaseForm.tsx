
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseFormInput, Raffle } from '@/types';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useTranslations } from '@/contexts/LocalizationContext';

interface PurchaseFormProps {
  raffle: Raffle;
}

const createPurchaseFormSchema = (availableNumbers: number[], t: Function) => z.object({
  buyerName: z.string().min(2, { message: t('purchaseForm.validation.nameMin') }),
  buyerPhone: z.string().min(5, { message: t('purchaseForm.validation.phoneMin') }),
  selectedNumbers: z.array(z.number()).min(1, { message: t('purchaseForm.validation.selectedNumbersMin') })
    .refine(numbers => numbers.every(num => availableNumbers.includes(num)), {
      message: t('purchaseForm.validation.selectedNumbersUnavailable')
    }),
  paymentMethod: z.enum(['Cash', 'Transfer', 'Pending'], { required_error: t('purchaseForm.validation.paymentMethodRequired') }),
});


export function PurchaseForm({ raffle }: PurchaseFormProps) {
  const { purchaseNumbers, getRaffleById } = useRaffles(); // Added getRaffleById for latest state
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [totalAmount, setTotalAmount] = useState(0);
  const { t, locale } = useTranslations();

  const initialUrlParamProcessed = useRef(false);

  const availableRaffleNumbers = useMemo(() => {
    // Ensure we are using the latest raffle state for available numbers
    const currentRaffle = getRaffleById(raffle.id) || raffle;
    return currentRaffle.numbers.filter(n => n.status === 'Available').map(n => n.id);
  }, [raffle.id, raffle.numbers, getRaffleById]); // Depend on raffle.numbers too

  const purchaseFormSchema = createPurchaseFormSchema(availableRaffleNumbers, t);
  
  const form = useForm<PurchaseFormInput>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      buyerName: '',
      buyerPhone: '',
      selectedNumbers: [],
      paymentMethod: undefined,
    },
  });

  const { setValue, getValues, watch } = form;
  const selectedNumbersWatch = watch('selectedNumbers');

  // Effect for pre-selecting a number from URL query parameter.
  // This should run once per relevant change in searchParams or raffle.id.
  useEffect(() => {
    if (initialUrlParamProcessed.current && searchParams.get('selectedNumber') === null) {
      // If already processed and no new selectedNumber param, do nothing to avoid interference
      return;
    }

    const preSelectedNumberStr = searchParams.get('selectedNumber');
    if (preSelectedNumberStr) {
      const preSelectedNumberVal = Number(preSelectedNumberStr);
      
      // Use the memoized availableRaffleNumbers which is derived from the latest raffle state
      if (availableRaffleNumbers.includes(preSelectedNumberVal)) {
        const currentSelections = getValues('selectedNumbers') || [];
        if (!currentSelections.includes(preSelectedNumberVal)) {
          setValue('selectedNumbers', [...currentSelections, preSelectedNumberVal], { shouldDirty: true, shouldValidate: true });
        }
      }
      initialUrlParamProcessed.current = true; // Mark as processed for this specific param value
    } else {
      // If there's no selectedNumber in the URL, ensure the flag allows future processing if a param appears
      initialUrlParamProcessed.current = false;
    }
  }, [searchParams, raffle.id, availableRaffleNumbers, setValue, getValues]);

  // Reset the processing flag if the raffle ID changes (e.g., navigating to a different purchase page)
  useEffect(() => {
    initialUrlParamProcessed.current = false;
  }, [raffle.id]);


  useEffect(() => {
    setTotalAmount((selectedNumbersWatch || []).length * raffle.numberValue);
  }, [selectedNumbersWatch, raffle.numberValue]);


  function onSubmit(data: PurchaseFormInput) {
    const currentRaffleState = getRaffleById(raffle.id); // Fetch latest state
    const currentAvailableAtSubmit = currentRaffleState 
        ? currentRaffleState.numbers.filter(n => n.status === 'Available').map(n => n.id)
        : availableRaffleNumbers; 


    const allSelectedAreStillAvailable = data.selectedNumbers.every(num => currentAvailableAtSubmit.includes(num));

    if (!allSelectedAreStillAvailable) {
        toast({
            title: t('purchaseForm.toast.errorTitle'),
            description: t('purchaseForm.validation.selectedNumbersUnavailable'),
            variant: 'destructive'
        });
        const stillValidSelections = data.selectedNumbers.filter(numId => currentAvailableAtSubmit.includes(numId));
        form.setValue('selectedNumbers', stillValidSelections);
        return;
    }

    const success = purchaseNumbers(raffle.id, data.buyerName, data.buyerPhone, data.selectedNumbers, data.paymentMethod);
    if (success) {
      toast({ 
        title: t('purchaseForm.toast.successTitle'), 
        description: t('purchaseForm.toast.successDescription', { count: data.selectedNumbers.length, buyerName: data.buyerName }) 
      });
      router.push(`/raffles/${raffle.id}`);
    } else {
      toast({ 
        title: t('purchaseForm.toast.errorTitle'), 
        description: t('purchaseForm.toast.errorDescription'), 
        variant: 'destructive' 
      });
      const refreshedRaffleState = getRaffleById(raffle.id);
      const stillAvailableForSelectionAfterFailedSubmit = refreshedRaffleState
        ? refreshedRaffleState.numbers.filter(n => n.status === 'Available').map(n => n.id)
        : availableRaffleNumbers;
      const stillValidUserSelection = data.selectedNumbers.filter(numId => stillAvailableForSelectionAfterFailedSubmit.includes(numId));
      form.setValue('selectedNumbers', stillValidUserSelection);
    }
  }

  const formatPrice = (value: number, currencySymbol: string, currencyCode: string) => {
    if (currencyCode === 'CLP') {
      return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }
    return `${currencySymbol}${value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };
  
  const pricePerNumberFormatted = formatPrice(raffle.numberValue, raffle.country.currencySymbol, raffle.country.currencyCode);
  const totalAmountFormatted = formatPrice(totalAmount, raffle.country.currencySymbol, raffle.country.currencyCode);


  return (
    <Card className="max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t('purchaseForm.title')}</CardTitle>
        <CardDescription>{t('purchaseForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="buyerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('purchaseForm.labels.fullName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('purchaseForm.placeholders.fullName')} {...field} />
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
                  <FormLabel>{t('purchaseForm.labels.phoneNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('purchaseForm.placeholders.phoneNumber')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="selectedNumbers"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>{t('purchaseForm.labels.selectNumbers')}</FormLabel>
                    <FormDescription>
                      {t('purchaseForm.selectNumbersDescription', { price: pricePerNumberFormatted })}
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="grid grid-cols-5 gap-2">
                    {availableRaffleNumbers.length === 0 ? <p className="col-span-full text-center text-muted-foreground">{t('purchaseForm.allNumbersSoldOut')}</p> : 
                      availableRaffleNumbers.map((numberId) => (
                        <FormItem 
                          key={numberId}
                          className="flex flex-row items-center justify-center space-x-0 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              className="sr-only" 
                              checked={(field.value || []).includes(numberId)}
                              onCheckedChange={(checked) => {
                                const currentSelected = field.value || [];
                                let newSelected: number[];
                                if (checked) {
                                  newSelected = [...currentSelected, numberId];
                                } else {
                                  newSelected = currentSelected.filter(id => id !== numberId);
                                }
                                field.onChange(newSelected);
                              }}
                              id={`number-checkbox-${numberId}`}
                            />
                          </FormControl>
                          <FormLabel 
                            htmlFor={`number-checkbox-${numberId}`}
                            className={`flex items-center justify-center w-full aspect-square rounded-md border cursor-pointer transition-colors
                              ${(field.value || []).includes(numberId) 
                                ? 'bg-primary text-primary-foreground border-primary' 
                                : 'bg-card hover:bg-accent/50'}`}
                          >
                            {numberId}
                          </FormLabel>
                        </FormItem>
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
                  <FormLabel>{t('purchaseForm.labels.paymentMethod')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('purchaseForm.placeholders.selectPaymentMethod')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">{t('purchaseForm.paymentMethods.cash')}</SelectItem>
                      <SelectItem value="Transfer">{t('purchaseForm.paymentMethods.transfer')}</SelectItem>
                      <SelectItem value="Pending">{t('purchaseForm.paymentMethods.pending')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(selectedNumbersWatch || []).length > 0 && (
              <div className="p-4 bg-accent/30 rounded-md text-center">
                <p className="text-lg font-semibold">{t('purchaseForm.totalAmount')}: 
                  <Badge variant="secondary" className="ml-2 text-lg bg-primary text-primary-foreground">
                    {totalAmountFormatted}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseForm.totalAmountDetails', {count: (selectedNumbersWatch || []).length, price: pricePerNumberFormatted})}
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={availableRaffleNumbers.length === 0 || (selectedNumbersWatch || []).length === 0}>
              {t('purchaseForm.purchaseButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

