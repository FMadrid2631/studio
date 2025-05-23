
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
import { useEffect, useState, useMemo } from 'react'; // Added useMemo
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
  const { purchaseNumbers } = useRaffles();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [totalAmount, setTotalAmount] = useState(0);
  const { t } = useTranslations();

  const availableRaffleNumbers = useMemo(() => {
    return raffle.numbers.filter(n => n.status === 'Available').map(n => n.id);
  }, [raffle.numbers]);

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

  const selectedNumbersWatch = form.watch('selectedNumbers');

  useEffect(() => {
    const preSelectedNumberStr = searchParams.get('selectedNumber');
    if (preSelectedNumberStr) {
      const preSelectedNumberVal = Number(preSelectedNumberStr);
      // Ensure the number is actually available before attempting to select it
      if (availableRaffleNumbers.includes(preSelectedNumberVal)) {
        const currentSelections = form.getValues('selectedNumbers') || [];
        // Only add if not already present, to prevent loops and respect user's deselection
        if (!currentSelections.includes(preSelectedNumberVal)) {
          form.setValue('selectedNumbers', [...currentSelections, preSelectedNumberVal], { shouldDirty: true });
        }
      }
    }
    // This effect should run when the ability to pre-select changes (e.g. new raffle, new query param)
  }, [searchParams, availableRaffleNumbers, form, raffle.id]);


  useEffect(() => {
    setTotalAmount((selectedNumbersWatch || []).length * raffle.numberValue);
  }, [selectedNumbersWatch, raffle.numberValue]);


  function onSubmit(data: PurchaseFormInput) {
    // Re-fetch current available numbers at the time of submission for final validation
    const currentAvailableAtSubmit = raffle.numbers.filter(n => n.status === 'Available').map(n => n.id);
    const allSelectedAreStillAvailable = data.selectedNumbers.every(num => currentAvailableAtSubmit.includes(num));

    if (!allSelectedAreStillAvailable) {
        toast({
            title: t('purchaseForm.toast.errorTitle'),
            description: t('purchaseForm.validation.selectedNumbersUnavailable'), // Or a more specific "some numbers were taken while you were selecting"
            variant: 'destructive'
        });
        // Update form with only the numbers that are still valid from their selection
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
      // Refresh available numbers and update form selection if some were taken
      const stillAvailableForSelection = raffle.numbers.filter(n => n.status === 'Available').map(n => n.id);
      const stillValidUserSelection = data.selectedNumbers.filter(numId => stillAvailableForSelection.includes(numId));
      form.setValue('selectedNumbers', stillValidUserSelection);
    }
  }

  return (
    <Card className="max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{t('purchaseForm.title', { raffleName: raffle.name })}</CardTitle>
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
                      {t('purchaseForm.selectNumbersDescription', {value: raffle.numberValue, currencySymbol: raffle.country.currencySymbol})}
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-48 border rounded-md p-2">
                    <div className="grid grid-cols-5 gap-2">
                    {availableRaffleNumbers.length === 0 ? <p className="col-span-full text-center text-muted-foreground">{t('purchaseForm.allNumbersSoldOut')}</p> : 
                      availableRaffleNumbers.map((numberId) => (
                        <FormItem // Using FormItem for structure and a11y association
                          key={numberId}
                          className="flex flex-row items-center justify-center space-x-0 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              className="sr-only" // Checkbox is visually hidden, label is the click target
                              checked={(field.value || []).includes(numberId)}
                              onCheckedChange={(checked) => {
                                const currentSelected = field.value || [];
                                let newSelected: number[];
                                if (checked) {
                                  newSelected = [...currentSelected, numberId];
                                } else {
                                  newSelected = currentSelected.filter(id => id !== numberId);
                                }
                                field.onChange(newSelected); // Update the 'selectedNumbers' array
                              }}
                              id={`number-checkbox-${numberId}`} // Unique ID for the checkbox
                            />
                          </FormControl>
                          <FormLabel 
                            htmlFor={`number-checkbox-${numberId}`} // Associate label with checkbox
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
                  <FormMessage /> {/* For validation messages related to selectedNumbers array */}
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
                    {totalAmount.toFixed(2)} {raffle.country.currencySymbol}
                  </Badge>
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseForm.totalAmountDetails', {count: (selectedNumbersWatch || []).length, value: raffle.numberValue, currencySymbol: raffle.country.currencySymbol})}
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
