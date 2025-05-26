
'use client';
import { RaffleConfigureForm } from '@/components/raffle/RaffleConfigureForm';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Ban } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';


export default function ConfigureRafflePage() {
  const { t, changeLocaleForRaffle } = useTranslations();
  const { currentUser, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Reset locale to default when on configure page if no specific raffle context
  useEffect(() => {
    if (!currentUser) { // Only reset if no user, otherwise raffle context might set it
        changeLocaleForRaffle(undefined);
    }
  }, [changeLocaleForRaffle, currentUser]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    // Should ideally be caught by middleware or redirects from AuthContext,
    // but as a fallback, redirect to login.
    // router.replace('/login'); // This can cause hydration issues if done too early
    // Showing a message might be safer if direct access is possible and not caught earlier.
     return (
        <Card className="max-w-lg mx-auto text-center shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive flex items-center justify-center">
                    <Ban className="mr-2 h-6 w-6" />
                    {t('configurePage.accessDenied.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{t('configurePage.accessDenied.notLoggedInDescription')}</p>
            </CardContent>
        </Card>
     );
  }

  if (currentUser.status === 'pending') {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
            <CardTitle className="text-2xl text-amber-600 flex items-center justify-center">
                <AlertCircle className="mr-2 h-6 w-6" />
                {t('configurePage.accountPending.title')}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
              {t('configurePage.accountPending.descriptionPart1')}
              <a
                href={`https://wa.me/${t('configurePage.whatsappSupportNumberValue')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                {t('configurePage.whatsappSupportNumberText')}
              </a>
              {t('configurePage.accountPending.descriptionPart2')}
            </p>
        </CardContent>
      </Card>
    );
  }

  if (currentUser.status === 'inactive') {
     return (
        <Card className="max-w-lg mx-auto text-center shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive flex items-center justify-center">
                     <Ban className="mr-2 h-6 w-6" />
                    {t('configurePage.accountInactive.title')}
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground">
                    {t('configurePage.accountInactive.descriptionPart1')}
                    <a
                        href={`https://wa.me/${t('configurePage.whatsappSupportNumberValue')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold"
                    >
                        {t('configurePage.whatsappSupportNumberText')}
                    </a>
                    {t('configurePage.accountInactive.descriptionPart2')}
                </p>
            </CardContent>
        </Card>
     );
  }

  // User is logged in and status is 'active'
  return (
    <div>
      {/* The form title is inside RaffleConfigureForm, page title could be set via document.title if needed */}
      <RaffleConfigureForm />
    </div>
  );
}

    