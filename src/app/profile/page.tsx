
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const { currentUser, isLoading, logout } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    // This is a client-side redirect. Proper route protection often involves middleware.
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex justify-center items-start pt-10 min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          {/* Placeholder for user avatar - can enhance later */}
          <div className="p-2 bg-primary/20 rounded-full inline-block mb-4">
            <UserCircle className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            {currentUser.displayName || t('auth.anonymousUser')}
          </CardTitle>
          <CardDescription>{t('auth.profileSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('auth.emailLabel')}</p>
              <p className="text-lg">{currentUser.email}</p>
            </div>
            {currentUser.rut && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('auth.rutLabel')}</p>
                <p className="text-lg">{currentUser.rut}</p>
              </div>
            )}
             {/* Add more profile fields as needed */}
          </div>
          <Button variant="outline" className="w-full mt-6" onClick={logout}>
            {t('auth.logoutButton')}
          </Button>
           {/* Placeholder for Edit Profile button */}
           {/* <Button variant="default" className="w-full mt-2" disabled>
             {t('auth.editProfileButton')} (Not implemented)
           </Button> */}
        </CardContent>
      </Card>
    </div>
  );
}

// Need to add useEffect for client-side redirect
import { useEffect } from 'react';
