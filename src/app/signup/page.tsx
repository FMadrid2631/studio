
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import type { SignupFormInput } from '@/types';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Loader2 } from 'lucide-react';
import { COUNTRIES } from '@/lib/countries';

// Define Zod schema using translation function for messages
const createSignupFormSchema = (t: Function) => z.object({
  displayName: z.string().min(2, { message: t('auth.validation.displayNameMin') }),
  rut: z.string().min(8, { message: t('auth.validation.rutMin') })
             .regex(/^[0-9]+-[0-9kK]$/, { message: t('auth.validation.rutFormat') }),
  email: z.string().email({ message: t('auth.validation.emailInvalid') }),
  countryCode: z.string().min(1, { message: t('auth.validation.countryRequired')}),
  phoneNumber: z.string().min(5, { message: t('auth.validation.phoneMin')}),
  password_signup: z.string().min(6, { message: t('auth.validation.passwordMin') }),
  confirmPassword: z.string().min(6, { message: t('auth.validation.passwordMin') })
}).refine(data => data.password_signup === data.confirmPassword, {
  message: t('auth.validation.passwordsNoMatch'),
  path: ["confirmPassword"],
});

export default function SignupPage() {
  const { signup, isLoading } = useAuth();
  const { t } = useTranslations();

  const signupFormSchema = createSignupFormSchema(t);

  const form = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      displayName: '',
      rut: '',
      email: '',
      countryCode: '',
      phoneNumber: '',
      password_signup: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: SignupFormInput) => {
    try {
      await signup(data);
    } catch (error) {
      console.error("Signup failed:", error);
      // Handle signup error (e.g., show toast) in signup function itself if using real auth
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)] py-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">{t('auth.signupTitle')}</CardTitle>
          <CardDescription>{t('auth.signupSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.displayNameLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.displayNamePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rut"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.rutLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.rutPlaceholder')} {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.emailLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.emailPlaceholder')} {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.countryLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('auth.countryPlaceholder')} />
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.phoneNumberLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('auth.phoneNumberPlaceholder')} {...field} type="tel" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password_signup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.passwordLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.confirmPasswordLabel')}</FormLabel>
                    <FormControl>
                      <Input placeholder="••••••••" {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.signupButton')}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.alreadyAccountPrompt')}{' '}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              {t('auth.loginLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
