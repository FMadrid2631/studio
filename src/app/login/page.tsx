
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import type { LoginFormInput } from '@/types';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

// Define Zod schema using translation function for messages
const createLoginFormSchema = (t: Function) => z.object({
  email: z.string().email({ message: t('auth.validation.emailInvalid') }),
  password_login: z.string().min(1, { message: t('auth.validation.passwordRequired') }), // min(6) in real app
});


export default function LoginPage() {
  const { login, loginWithGoogle, loginWithApple, isLoading } = useAuth();
  const { t } = useTranslations();

  const loginFormSchema = createLoginFormSchema(t);

  const form = useForm<LoginFormInput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password_login: '',
    },
  });

  const onSubmit = async (data: LoginFormInput) => {
    try {
      await login(data);
    } catch (error) {
      console.error("Login failed:", error);
      // Handle login error (e.g., show toast) in the login function itself if using real auth
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">{t('auth.loginTitle')}</CardTitle>
          <CardDescription>{t('auth.loginSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                name="password_login"
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
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('auth.loginButton')}
              </Button>
            </form>
          </Form>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
            </div>
          </div>
          <div className="space-y-3">
            <Button variant="outline" className="w-full" onClick={loginWithGoogle} disabled={isLoading}>
              {/* Replace with Google icon if available or needed */}
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
              {t('auth.loginWithGoogleButton')}
            </Button>
            <Button variant="outline" className="w-full" onClick={loginWithApple} disabled={isLoading}>
               {/* Replace with Apple icon */}
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.688 14.469c-.001 1.101.886 2.002 2.008 2.002s2.012-.895 2.012-2.002c0-1.101-.894-2.002-2.012-2.002s-2.007.901-2.008 2.002zm-5.04-8.081c1.018-.01 2.218.512 2.912 1.203.798.792 1.206 1.969 1.206 2.956 0 .164-.015.336-.025.499a4.46 4.46 0 0 1-1.981 3.366c-.834.696-2.097 1.188-3.122 1.188-.969 0-2.162-.493-2.87-1.191-.802-.797-1.226-1.998-1.216-3.012 0-.141.013-.318.025-.47a4.353 4.353 0 0 1 1.988-3.361c.831-.673 2.024-1.17 3.083-1.171zm-.459 9.492c.351 0 .929-.151 1.586-.453.759-.354 1.262-.772 1.637-1.253-.409-.681-.994-1.077-1.778-1.077-.672 0-1.378.311-1.88.804-.486.479-.779 1.18-.779 1.918a.615.615 0 0 0 .214.061zM12 1C5.373 1 0 6.373 0 13s5.373 12 12 12 12-5.373 12-12S18.627 1 12 1zm7.062 17.993c-.706.961-1.607 1.802-2.663 2.49a7.418 7.418 0 0 1-2.97.663 7.506 7.506 0 0 1-2.92-.604c-1.035-.665-1.915-1.49-2.612-2.434-.113-.156-.074-.379.083-.492.157-.113.38-.074.492.083.631.851 1.423 1.6 2.362 2.178.852.53 1.804.802 2.787.802s1.968-.291 2.828-.844c.936-.595 1.727-1.353 2.346-2.214.113-.157.336-.195.492-.083.157.112.195.335.083.492l-.002.003z" /></svg>
              {t('auth.loginWithAppleButton')}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('auth.noAccountPrompt')}{' '}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              {t('auth.signupLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
