
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PurchaseFormInput, Raffle, RaffleNumber as RaffleNumberType } from '@/types';
import { useRaffles } from '@/contexts/RaffleContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { useTranslations } from '@/contexts/LocalizationContext';
import { cn } from '@/lib/utils';
import { AlertCircle, Banknote, Info } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription as ShadAlertDescription } from '../ui/alert';


interface PurchaseFormProps {
  raffle: Raffle;
}

const createPurchaseFormSchema = (allRaffleNumbers: RaffleNumberType[], t: Function) => z.object({
  buyerName: z.string().min(2, { message: t('purchaseForm.validation.nameMin') }),
  buyerPhone: z.string().min(5, { message: t('purchaseForm.validation.phoneMin') }),
  selectedNumbers: z.array(z.number()).min(1, { message: t('purchaseForm.validation.selectedNumbersMin') })
    .refine(numbers => numbers.every(numId => {
      const raffleNum = allRaffleNumbers.find(n => n.id === numId);
      return raffleNum && raffleNum.status === 'Available';
    }), {
      message: t('purchaseForm.validation.selectedNumbersUnavailableGeneral')
    }),
  paymentMethod: z.enum(['Cash', 'Transfer', 'Pending'], { required_error: t('purchaseForm.validation.paymentMethodRequired') }),
});


export function PurchaseForm({ raffle: initialRaffle }: PurchaseFormProps) {
  const { purchaseNumbers, getRaffleById } = useRaffles();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [totalAmount, setTotalAmount] = useState(0);
  const { t, locale } = useTranslations();

  const raffle = useMemo(() => getRaffleById(initialRaffle.id) || initialRaffle, [getRaffleById, initialRaffle]);

  const paramProcessedForCurrentState = useRef(false);
  const processedRaffleIdRef = useRef<string | null>(null);
  const processedParamValueRef = useRef<string | null>(null);
  
  const purchaseFormSchema = useMemo(() => {
    return createPurchaseFormSchema(raffle.numbers, t);
  }, [raffle.numbers, t]);

  const form = useForm<PurchaseFormInput>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      buyerName: '',
      buyerPhone: '',
      selectedNumbers: [],
      paymentMethod: undefined,
    },
  });

  const { watch, setValue, getValues, control } = form;
  const selectedNumbersWatch = watch('selectedNumbers');
  const paymentMethodWatch = watch('paymentMethod');

  useEffect(() => {
    const currentRaffleId = raffle.id;
    const preSelectedNumberStr = searchParams.get('selectedNumber');

    if (currentRaffleId !== processedRaffleIdRef.current || preSelectedNumberStr !== processedParamValueRef.current) {
        paramProcessedForCurrentState.current = false;
        processedRaffleIdRef.current = currentRaffleId;
        processedParamValueRef.current = preSelectedNumberStr;
    }
    
    const availableRaffleNumbers = raffle.numbers.filter(n => n.status === 'Available');
    const availableIds = availableRaffleNumbers.map(n => n.id);

    if (preSelectedNumberStr && !paramProcessedForCurrentState.current && availableIds.length > 0) {
        const preSelectedNumberVal = Number(preSelectedNumberStr);
        if (availableIds.includes(preSelectedNumberVal)) {
            const currentSelections = getValues('selectedNumbers') || [];
            if (!currentSelections.includes(preSelectedNumberVal)) {
                setValue('selectedNumbers', [...currentSelections, preSelectedNumberVal], {
                    shouldDirty: true,
                    shouldValidate: true,
                });
            }
        }
        paramProcessedForCurrentState.current = true; 
    } else if (!preSelectedNumberStr && processedParamValueRef.current !== null) {
        // Reset if the param is removed, allowing new param processing if it reappears
        paramProcessedForCurrentState.current = false;
        processedParamValueRef.current = null; // Clear the stored param value
    }
  }, [searchParams, raffle.id, raffle.numbers, setValue, getValues, paramProcessedForCurrentState, processedRaffleIdRef, processedParamValueRef]);


  useEffect(() => {
    setTotalAmount((selectedNumbersWatch || []).length * raffle.numberValue);
  }, [selectedNumbersWatch, raffle.numberValue]);


  function onSubmit(data: PurchaseFormInput) {
    const currentRaffleState = getRaffleById(raffle.id); 
    if (!currentRaffleState) {
        toast({ title: t('raffleDetailsPage.raffleNotFoundTitle'), description: t('purchaseForm.toast.errorRaffleState'), variant: 'destructive' });
        return;
    }
    const currentAvailableAtSubmit = currentRaffleState.numbers
        .filter(n => n.status === 'Available')
        .map(n => n.id);

    const allSelectedAreStillAvailable = data.selectedNumbers.every(num => currentAvailableAtSubmit.includes(num));

    if (!allSelectedAreStillAvailable) {
        toast({
            title: t('purchaseForm.toast.errorTitle'),
            description: t('purchaseForm.validation.selectedNumbersUnavailableGeneral'),
            variant: 'destructive'
        });
        const stillValidSelections = data.selectedNumbers.filter(numId => currentAvailableAtSubmit.includes(numId));
        setValue('selectedNumbers', stillValidSelections);
        return;
    }

    const success = purchaseNumbers(raffle.id, data.buyerName, data.buyerPhone, data.selectedNumbers, data.paymentMethod);
    if (success) {
      toast({
        title: t('purchaseForm.toast.successTitle'),
        description: t('purchaseForm.toast.successDescription', { count: data.selectedNumbers.length, buyerName: data.buyerName })
      });
      const newSearchParams = new URLSearchParams(searchParams.toString());
      if (newSearchParams.has('selectedNumber')) {
        newSearchParams.delete('selectedNumber');
        router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
      } else {
         // Only push if not already on the details page, or handle as needed
        router.push(`/raffles/${raffle.id}`); 
      }
       form.reset(); 

    } else {
      toast({
        title: t('purchaseForm.toast.errorTitle'),
        description: t('purchaseForm.toast.errorDescription'),
        variant: 'destructive'
      });
      // Refresh the available numbers in the grid if the purchase fails
      const refreshedRaffleState = getRaffleById(raffle.id);
      const stillAvailableForSelectionAfterFailedSubmit = refreshedRaffleState
        ? refreshedRaffleState.numbers.filter(n => n.status === 'Available').map(n => n.id)
        : currentAvailableAtSubmit; // Fallback to previous list if refresh fails for some reason
      
      const stillValidUserSelection = data.selectedNumbers.filter(numId => stillAvailableForSelectionAfterFailedSubmit.includes(numId));
      setValue('selectedNumbers', stillValidUserSelection);
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

  const handleNumberClick = (numberId: number, status: RaffleNumberType['status']) => {
    if (status !== 'Available') return; 

    const currentSelected = getValues('selectedNumbers') || [];
    let newSelected: number[];
    if (currentSelected.includes(numberId)) {
      newSelected = currentSelected.filter(id => id !== numberId);
    } else {
      newSelected = [...currentSelected, numberId];
    }
    setValue('selectedNumbers', newSelected, { shouldValidate: true, shouldDirty: true });
  };

  const getNumberStatusClass = (status: RaffleNumberType['status'], isSelected: boolean) => {
    if (status === 'Purchased') return 'bg-green-500 text-white cursor-not-allowed opacity-70';
    if (status === 'PendingPayment') return 'bg-yellow-400 text-black cursor-not-allowed opacity-70';
    if (isSelected) return 'bg-primary text-primary-foreground border-primary';
    return 'bg-card hover:bg-accent/50 border';
  };
  
  const allRaffleNumbersForGrid = raffle.numbers; 
  const getTranslatedStatus = (status: RaffleNumberType['status']) => t(`numberStatus.${status}`);

  const hasBankDetails = raffle.bankDetails && 
                         (raffle.bankDetails.bankName || 
                          raffle.bankDetails.accountHolderName || 
                          raffle.bankDetails.accountNumber);

  let displayedTransferInstructions = raffle.bankDetails?.transferInstructions || '';
  if (paymentMethodWatch === 'Transfer' && selectedNumbersWatch && selectedNumbersWatch.length > 0) {
    const numbersString = selectedNumbersWatch.join(', ');
    const reminderTextKey = displayedTransferInstructions 
      ? 'purchaseForm.bankTransferDetails.selectedNumbersInstructionSuffix' 
      : 'purchaseForm.bankTransferDetails.selectedNumbersInstructionStandalone';
    const reminderText = t(reminderTextKey, { selectedNumbersList: numbersString });
    
    displayedTransferInstructions = displayedTransferInstructions 
      ? `${displayedTransferInstructions}. ${reminderText}` 
      : reminderText;
  }


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
              control={control}
              name="selectedNumbers" 
              render={({ field }) => ( 
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>{t('purchaseForm.labels.selectNumbers')}</FormLabel>
                    <FormDescription>
                      {t('purchaseForm.selectNumbersDescription', { price: pricePerNumberFormatted })}
                    </FormDescription>
                  </div>
                  <ScrollArea className="h-60 border rounded-md p-2">
                    <div className="grid grid-cols-10 gap-1.5"> 
                    {allRaffleNumbersForGrid.length === 0 ? (
                        <p className="col-span-full text-center text-muted-foreground">{t('purchaseForm.noNumbersInRaffle')}</p>
                    ) : (
                      allRaffleNumbersForGrid.map((num) => {
                        const isSelected = (field.value || []).includes(num.id);
                        const isAvailable = num.status === 'Available';
                        const titleText = isAvailable 
                                          ? t('raffleGrid.tooltip.number', { id: num.id }) + ` (${t('numberStatus.Available')})`
                                          : t('raffleGrid.tooltip.number', { id: num.id }) + ` (${getTranslatedStatus(num.status)})`;
                        return (
                          <div
                            key={num.id}
                            onClick={() => handleNumberClick(num.id, num.status)}
                            role="button"
                            tabIndex={isAvailable ? 0 : -1}
                            onKeyDown={(e) => {
                              if (isAvailable && (e.key === 'Enter' || e.key === ' ')) {
                                handleNumberClick(num.id, num.status);
                              }
                            }}
                            className={cn(
                              'aspect-square flex items-center justify-center text-xs sm:text-sm font-medium rounded-md transition-colors',
                              getNumberStatusClass(num.status, isSelected),
                              isAvailable ? 'cursor-pointer' : ''
                            )}
                            aria-pressed={isSelected}
                            aria-disabled={!isAvailable}
                            title={titleText}
                          >
                            {num.id}
                          </div>
                        );
                      })
                    )}
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
                      <SelectItem value="Cash">{t('paymentMethodLabels.Cash')}</SelectItem>
                      <SelectItem value="Transfer">{t('paymentMethodLabels.Transfer')}</SelectItem>
                      <SelectItem value="Pending">{t('paymentMethodLabels.Pending')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {paymentMethodWatch === 'Transfer' && (
              hasBankDetails ? (
                <Card className="bg-accent/20 border-accent">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-primary" />
                      {t('purchaseForm.bankTransferDetails.title')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {raffle.bankDetails?.bankName && <p><strong>{t('configureForm.labels.bankName')}:</strong> {raffle.bankDetails.bankName}</p>}
                    {raffle.bankDetails?.accountHolderName && <p><strong>{t('configureForm.labels.accountHolderName')}:</strong> {raffle.bankDetails.accountHolderName}</p>}
                    {raffle.bankDetails?.accountNumber && <p><strong>{t('configureForm.labels.accountNumber')}:</strong> {raffle.bankDetails.accountNumber}</p>}
                    {raffle.bankDetails?.accountType && <p><strong>{t('configureForm.labels.accountType')}:</strong> {raffle.bankDetails.accountType}</p>}
                    {raffle.bankDetails?.identificationNumber && <p><strong>{t('configureForm.labels.identificationNumber')}:</strong> {raffle.bankDetails.identificationNumber}</p>}
                    {displayedTransferInstructions && (
                      <div className="mt-2 pt-2 border-t border-accent/50">
                        <p className="flex items-center gap-1 font-semibold"><Info className="h-4 w-4"/>{t('configureForm.labels.transferInstructions')}:</p>
                        <p className="whitespace-pre-wrap text-xs text-muted-foreground">{displayedTransferInstructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Alert variant="default" className="border-amber-500 bg-amber-50 text-amber-700">
                  <AlertCircle className="h-4 w-4 !text-amber-600" />
                  <AlertTitle>{t('purchaseForm.bankTransferDetails.notConfiguredTitle')}</AlertTitle>
                  <ShadAlertDescription>{t('purchaseForm.bankTransferDetails.notConfiguredDescription')}</ShadAlertDescription>
                </Alert>
              )
            )}


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

            <Button 
              type="submit" 
              className="w-full" 
              size="lg" 
              disabled={allRaffleNumbersForGrid.filter(n=>n.status === 'Available').length === 0 || (selectedNumbersWatch || []).length === 0}
            >
              {t('purchaseForm.purchaseButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
