'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { COUNTRIES, getCountryByCode } from '@/lib/countries';
import type { RaffleConfigurationFormInput, Country as CountryType } from '@/types';
import { useRaffles } from '@/contexts/RaffleContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const raffleFormSchema = z.object({
  name: z.string().min(3, { message: 'Raffle name must be at least 3 characters.' }),
  countryCode: z.string().min(1, { message: 'Please select a country.' }),
  totalNumbers: z.coerce.number().int().positive({ message: 'Total numbers must be positive.' }).min(10, {message: "Minimum 10 numbers"}).max(10000, {message: "Maximum 10000 numbers"}),
  numberValue: z.coerce.number().positive({ message: 'Number value must be positive.' }),
  numberOfPrizes: z.coerce.number().int().positive({ message: 'Number of prizes must be positive.' }).min(1).max(20),
  prizes: z.array(
    z.object({
      description: z.string().min(1, { message: 'Prize description cannot be empty.' }),
    })
  ).min(1, { message: 'At least one prize is required.' }),
  drawDate: z.date({ required_error: 'Draw date is required.' }),
});

export function RaffleConfigureForm() {
  const { addRaffle } = useRaffles();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<RaffleConfigurationFormInput>({
    resolver: zodResolver(raffleFormSchema),
    defaultValues: {
      name: '',
      countryCode: '',
      totalNumbers: 100,
      numberValue: 1,
      numberOfPrizes: 1,
      prizes: [{ description: '' }],
      drawDate: undefined,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'prizes',
  });

  const watchedNumberOfPrizes = form.watch('numberOfPrizes');
  const watchedCountryCode = form.watch('countryCode');
  const selectedCountry = getCountryByCode(watchedCountryCode);

  // Sync prizes array with numberOfPrizes
  React.useEffect(() => {
    const currentPrizesCount = fields.length;
    const targetPrizesCount = Number(watchedNumberOfPrizes) || 0;
    if (targetPrizesCount > currentPrizesCount) {
      for (let i = currentPrizesCount; i < targetPrizesCount; i++) {
        append({ description: '' });
      }
    } else if (targetPrizesCount < currentPrizesCount) {
      for (let i = currentPrizesCount -1 ; i >= targetPrizesCount; i--) {
        remove(i);
      }
    }
  }, [watchedNumberOfPrizes, fields.length, append, remove]);


  function onSubmit(data: RaffleConfigurationFormInput) {
    const country = COUNTRIES.find(c => c.code === data.countryCode);
    if (!country) {
      toast({ title: 'Error', description: 'Invalid country selected.', variant: 'destructive' });
      return;
    }

    const newRaffle = addRaffle({
      name: data.name,
      country: country,
      totalNumbers: data.totalNumbers,
      numberValue: data.numberValue,
      drawDate: data.drawDate.toISOString(),
      numberOfPrizes: data.numberOfPrizes,
      prizeDescriptions: data.prizes.map(p => p.description)
    });

    toast({ title: 'Success!', description: `Raffle "${newRaffle.name}" created.` });
    router.push(`/raffles/${newRaffle.id}`);
  }

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary">Create New Raffle</CardTitle>
        <CardDescription>Fill in the details below to set up your raffle.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raffle Name/Description</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Christmas Charity Raffle" {...field} />
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
                    <FormLabel>Country</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="numberValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Value per Number ({selectedCountry?.currencySymbol || 'Currency'})</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="E.g., 5" {...field} />
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
                    <FormLabel>Total Numbers in Raffle</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="E.g., 500" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="drawDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Draw Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate()-1)) } // Disable past dates
                          initialFocus
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
                  <FormLabel>Number of Prizes</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" max="20" placeholder="E.g., 3" {...field} />
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
                    <FormLabel>Prize {index + 1} Description (Major to Minor)</FormLabel>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder={`E.g., Grand Prize: A new car`} {...field} />
                      </FormControl>
                      {fields.length > 1 && (
                        <Button type="button" variant="destructive" size="icon" onClick={() => {
                          remove(index);
                          form.setValue('numberOfPrizes', Math.max(1, fields.length -1));
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
            
            <Button type="submit" className="w-full" size="lg">Create Raffle</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
