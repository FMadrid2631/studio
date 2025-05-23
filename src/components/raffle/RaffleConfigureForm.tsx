
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES, getCountryByCode } from '@/lib/countries';
import type { RaffleConfigurationFormInput, Raffle } from '@/types';
import { useRaffles } from '@/contexts/RaffleContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, Trash2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useTranslations } from '@/contexts/LocalizationContext';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { Separator } from '../ui/separator';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

const createRaffleFormSchema = (t: Function) => z.object({
  name: z.string().min(3, { message: t('configureForm.validation.nameMin') }),
  countryCode: z.string().min(1, { message: t('configureForm.validation.countryRequired') }),
  totalNumbers: z.coerce.number().int().positive({ message: t('configureForm.validation.totalNumbersPositive') }).min(10, {message: t('configureForm.validation.totalNumbersMin')}).max(10000, {message: t('configureForm.validation.totalNumbersMax')}),
  numberValue: z.coerce.number().positive({ message: t('configureForm.validation.numberValuePositive') }),
  numberOfPrizes: z.coerce.number().int().positive({ message: t('configureForm.validation.numberOfPrizesPositive') }).min(1, {message: t('configureForm.validation.numberOfPrizesMin')}).max(20, {message: t('configureForm.validation.numberOfPrizesMax')}),
  prizes: z.array(
    z.object({
      description: z.string().min(1, { message: t('configureForm.validation.prizeDescriptionEmpty') }),
    })
  ).min(1, { message: t('configureForm.validation.atLeastOnePrize') }),
  drawDate: z.date({ required_error: t('configureForm.validation.drawDateRequired') }),
  // Bank Details - all optional in Zod schema
  bankName: z.string().optional().or(z.literal('')),
  accountHolderName: z.string().optional().or(z.literal('')),
  accountNumber: z.string().optional().or(z.literal('')),
  accountType: z.string().optional().or(z.literal('')), // E.g., "Savings", "Checking"
  identificationNumber: z.string().optional().or(z.literal('')), // For CUIT, RUT, CPF
  transferInstructions: z.string().optional().or(z.literal('')),
});

interface RaffleConfigureFormProps {
  editingRaffle?: Raffle;
}

export function RaffleConfigureForm({ editingRaffle }: RaffleConfigureFormProps) {
  const { addRaffle, editRaffle } = useRaffles();
  const router = useRouter();
  const { toast } = useToast();
  const { t, locale, changeLocaleForRaffle } = useTranslations();
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  const isEditMode = !!editingRaffle;

  const raffleFormSchema = createRaffleFormSchema(t);

  const form = useForm<RaffleConfigurationFormInput>({
    resolver: zodResolver(raffleFormSchema),
    defaultValues: isEditMode && editingRaffle ? {
      name: editingRaffle.name,
      countryCode: editingRaffle.country.code,
      totalNumbers: editingRaffle.totalNumbers,
      numberValue: editingRaffle.numberValue,
      numberOfPrizes: editingRaffle.prizes.length,
      prizes: editingRaffle.prizes.map(p => ({ description: p.description })),
      drawDate: new Date(editingRaffle.drawDate),
      bankName: editingRaffle.bankDetails?.bankName || '',
      accountHolderName: editingRaffle.bankDetails?.accountHolderName || '',
      accountNumber: editingRaffle.bankDetails?.accountNumber || '',
      accountType: editingRaffle.bankDetails?.accountType || '',
      identificationNumber: editingRaffle.bankDetails?.identificationNumber || '',
      transferInstructions: editingRaffle.bankDetails?.transferInstructions || '',
    } : {
      name: '',
      countryCode: '',
      totalNumbers: 100,
      numberValue: 1,
      numberOfPrizes: 1,
      prizes: [{ description: '' }],
      drawDate: undefined,
      bankName: '',
      accountHolderName: '',
      accountNumber: '',
      accountType: '',
      identificationNumber: '',
      transferInstructions: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'prizes',
  });

  const watchedNumberOfPrizes = form.watch('numberOfPrizes');
  const watchedCountryCode = form.watch('countryCode');
  const selectedCountryDetails = getCountryByCode(watchedCountryCode || (editingRaffle?.country.code ?? ''));
  const prevWatchedNumberOfPrizes = usePrevious(watchedNumberOfPrizes);
  
  useEffect(() => {
    const targetCountryCode = editingRaffle ? editingRaffle.country.code : (watchedCountryCode || undefined);
    if (targetCountryCode) {
      changeLocaleForRaffle(targetCountryCode);
    } else {
      changeLocaleForRaffle(undefined); 
    }
  }, [editingRaffle, watchedCountryCode, changeLocaleForRaffle]);


  useEffect(() => {
    if (isEditMode && editingRaffle && !initialDataLoaded) {
      form.reset({
        name: editingRaffle.name,
        countryCode: editingRaffle.country.code,
        totalNumbers: editingRaffle.totalNumbers,
        numberValue: editingRaffle.numberValue,
        numberOfPrizes: editingRaffle.prizes.length,
        prizes: editingRaffle.prizes.map(p => ({ description: p.description })),
        drawDate: new Date(editingRaffle.drawDate),
        bankName: editingRaffle.bankDetails?.bankName || '',
        accountHolderName: editingRaffle.bankDetails?.accountHolderName || '',
        accountNumber: editingRaffle.bankDetails?.accountNumber || '',
        accountType: editingRaffle.bankDetails?.accountType || '',
        identificationNumber: editingRaffle.bankDetails?.identificationNumber || '',
        transferInstructions: editingRaffle.bankDetails?.transferInstructions || '',
      });
      setInitialDataLoaded(true);
    }
  }, [editingRaffle, form, isEditMode, initialDataLoaded]);
  

  useEffect(() => {
    if ((isEditMode && !initialDataLoaded)) return;

    const userChangedNumberOfPrizes = prevWatchedNumberOfPrizes !== undefined && prevWatchedNumberOfPrizes !== watchedNumberOfPrizes;

    if (!isEditMode || userChangedNumberOfPrizes) {
        const currentPrizesCount = fields.length;
        const targetPrizesCount = Number(watchedNumberOfPrizes) || 0;

        if (targetPrizesCount > currentPrizesCount) {
            for (let i = currentPrizesCount; i < targetPrizesCount; i++) {
                append({ description: '' });
            }
        } else if (targetPrizesCount < currentPrizesCount) {
             if (isEditMode && !userChangedNumberOfPrizes && initialDataLoaded) {
                // This case is handled by form.reset
             } else {
                for (let i = currentPrizesCount - 1; i >= targetPrizesCount; i--) {
                    if (fields[i]) { 
                        remove(i);
                    }
                }
             }
        }
    }
  }, [watchedNumberOfPrizes, prevWatchedNumberOfPrizes, fields.length, append, remove, isEditMode, initialDataLoaded]);


  function onSubmit(data: RaffleConfigurationFormInput) {
    
    if (isEditMode && editingRaffle) {
      const updatedRaffle = editRaffle(editingRaffle.id, data);
      if (updatedRaffle) {
        toast({ title: t('configureForm.toast.updateSuccessTitle'), description: t('configureForm.toast.updateSuccessDescription', {raffleName: updatedRaffle.name }) });
        router.push(`/raffles/${updatedRaffle.id}`);
      } else {
         toast({ title: t('configureForm.toast.errorTitle'), description: t('configureForm.toast.errorUpdate'), variant: 'destructive' });
      }
    } else {
       const country = COUNTRIES.find(c => c.code === data.countryCode);
       if (!country) {
         toast({ title: t('configureForm.toast.errorTitle'), description: t('configureForm.toast.errorCountry'), variant: 'destructive' });
         return;
       }
      const newRaffle = addRaffle({
        name: data.name,
        countryCode: data.countryCode, // Pass countryCode
        country: country, // This will be ignored by addRaffle if countryCode is used, but keep for type consistency
        totalNumbers: data.totalNumbers,
        numberValue: data.numberValue,
        drawDate: data.drawDate,
        prizeDescriptions: data.prizes.map(p => p.description),
        bankName: data.bankName,
        accountHolderName: data.accountHolderName,
        accountNumber: data.accountNumber,
        accountType: data.accountType,
        identificationNumber: data.identificationNumber,
        transferInstructions: data.transferInstructions,
        // numberOfPrizes is derived from prizeDescriptions.length in addRaffle
        numberOfPrizes: data.prizes.length 
      });
      toast({ title: t('configureForm.toast.successTitle'), description: t('configureForm.toast.successDescription', {raffleName: newRaffle.name }) });
      router.push(`/raffles/${newRaffle.id}`);
    }
  }
  
  const dateLocale = getLocaleFromString(locale);
  const currencySymbolForLabel = selectedCountryDetails?.currencySymbol || (isEditMode && editingRaffle ? editingRaffle.country.currencySymbol : '$');

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">{isEditMode ? t('editRafflePage.title') : t('configureForm.title')}</CardTitle>
        <CardDescription>{isEditMode ? t('editRafflePage.description') : t('configureForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configureForm.labels.raffleName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('configureForm.placeholders.raffleName')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.country')}</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                      }} 
                      defaultValue={field.value} 
                      disabled={isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('configureForm.placeholders.selectCountry')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isEditMode && <FormDescription>{t('configureForm.fieldsDisabledEdit')}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.numberValue', { currencySymbol: currencySymbolForLabel })}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder={t('configureForm.placeholders.numberValue')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="totalNumbers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.totalNumbers')}</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder={t('configureForm.placeholders.totalNumbers')} {...field} disabled={isEditMode} />
                    </FormControl>
                     {isEditMode && <FormDescription>{t('configureForm.fieldsDisabledEdit')}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drawDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>{t('configureForm.labels.drawDate')}</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP", { locale: dateLocale }) : <span>{t('configureForm.placeholders.pickDate')}</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1)) }
                          initialFocus
                          locale={dateLocale}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="numberOfPrizes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configureForm.labels.numberOfPrizes')}</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="20" placeholder={t('configureForm.placeholders.numberOfPrizes')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fields.map((item, index) => (
              <FormField
                key={item.id}
                control={form.control}
                name={`prizes.${index}.description`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.prizeDescription', { index: index + 1 })}</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder={t('configureForm.placeholders.prizeDescription')} {...field} />
                      </FormControl>
                      {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => {
                          remove(index);
                          const newNumberOfPrizes = Math.max(1, fields.length - 1);
                          form.setValue('numberOfPrizes', newNumberOfPrizes, { shouldValidate: true });
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <Separator className="my-6" />
            <h3 className="text-xl font-semibold text-muted-foreground">{t('configureForm.bankDetails.title')}</h3>
            <FormDescription className="flex items-center gap-1">
              <Info className="h-4 w-4 text-muted-foreground" />
              {t('configureForm.bankDetails.description')}
            </FormDescription>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.bankName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('configureForm.placeholders.bankName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountHolderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.accountHolderName')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('configureForm.placeholders.accountHolderName')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="accountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.accountNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('configureForm.placeholders.accountNumber')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accountType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('configureForm.labels.accountType')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('configureForm.placeholders.accountType')} {...field} />
                    </FormControl>
                     <FormDescription>{t('configureForm.placeholders.accountTypeHint')}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="identificationNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configureForm.labels.identificationNumber')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('configureForm.placeholders.identificationNumber')} {...field} />
                  </FormControl>
                  <FormDescription>{t('configureForm.placeholders.identificationNumberHint')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="transferInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('configureForm.labels.transferInstructions')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('configureForm.placeholders.transferInstructions')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="submit" className="w-full" size="lg">
              {isEditMode ? t('configureForm.buttons.updateRaffle') : t('configureForm.buttons.createRaffle')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
