
'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, UserCircle, ArrowLeft, ShieldCheck, User, CheckCircle, AlertCircle, XCircle, Clock, Mail, Phone, MapPin, CalendarDays, Fingerprint } from 'lucide-react';
import type { AuthUser } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import { COUNTRIES } from '@/lib/countries';

export default function AdminViewUserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { currentUser, isLoading: authLoading, allUsers } = useAuth();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const dateLocale = getLocaleFromString(locale);

  // Effect for redirection if not admin
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [authLoading, currentUser, router]);

  // Derive viewUser directly from context props
  const viewUser = useMemo(() => {
    if (authLoading || !userId || !currentUser || currentUser.role !== 'admin') {
      // If auth is loading, or no userId, or current user is not loaded or not an admin,
      // we can't determine the viewUser yet or shouldn't try.
      return undefined;
    }
    // At this point, auth is loaded, currentUser is admin, and userId is present.
    // Now, find the user from the current allUsers list.
    return allUsers.find(u => u.uid === userId) || null; // null if not found
  }, [authLoading, userId, currentUser, allUsers]);


  if (authLoading || viewUser === undefined) {
    // Show loader if auth is still loading OR if viewUser is undefined
    // (meaning conditions to find user weren't met yet, e.g., currentUser not yet admin)
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  // This check is somewhat redundant if the useEffect for redirection works,
  // but serves as a fallback if somehow the component renders before redirect.
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center justify-center">
            <AlertCircle className="mr-2 h-6 w-6" />
            {t('configurePage.accessDenied.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('shared.notAuthorized')}</p>
        </CardContent>
         <CardFooter>
          <Button variant="outline" onClick={() => router.push('/')}>
            {t('actions.backToHome')}
          </Button>
        </CardFooter>
      </Card>
    );
  }


  if (viewUser === null) { // viewUser is explicitly null, meaning user was not found
    return (
      <Card className="max-w-lg mx-auto text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl text-destructive flex items-center justify-center">
            <AlertCircle className="mr-2 h-6 w-6" />
            {t('admin.viewProfile.userNotFoundTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('admin.viewProfile.userNotFoundDescription')}</p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('admin.viewProfile.backToUsersList')}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If viewUser is an AuthUser object, render the profile details
  const userRoleDisplay = viewUser.role === 'admin'
    ? { text: t('auth.roleAdmin'), icon: <ShieldCheck className="mr-1 h-4 w-4 text-primary" />, variant: 'default' as const }
    : { text: t('auth.roleUser'), icon: <User className="mr-1 h-4 w-4 text-muted-foreground" />, variant: 'secondary' as const };

  const userStatusDisplay = () => {
    switch (viewUser.status) {
      case 'active':
        return { text: t('admin.userStatus.active'), icon: <CheckCircle className="mr-1 h-4 w-4 text-green-600" />, variant: 'default' as const, className: 'bg-green-100 text-green-700 border-green-300' };
      case 'pending':
        return { text: t('admin.userStatus.pending'), icon: <Clock className="mr-1 h-4 w-4 text-yellow-600" />, variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
      case 'inactive':
        return { text: t('admin.userStatus.inactive'), icon: <XCircle className="mr-1 h-4 w-4 text-red-600" />, variant: 'destructive' as const, className: 'bg-red-100 text-red-700 border-red-300' };
      default:
        return { text: t('shared.notAvailable'), icon: <AlertCircle className="mr-1 h-4 w-4" />, variant: 'outline' as const };
    }
  };
  const statusInfo = userStatusDisplay();
  const countryInfo = viewUser.countryCode ? COUNTRIES.find(c => c.code === viewUser.countryCode) : null;

  return (
    <div className="max-w-2xl mx-auto">
       <Button variant="outline" onClick={() => router.push('/admin/users')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('admin.viewProfile.backToUsersList')}
      </Button>
      <Card className="w-full shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="p-2 bg-primary/20 rounded-full inline-block mb-4">
            <UserCircle className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            {viewUser.displayName || t('auth.anonymousUser')}
          </CardTitle>
          <CardDescription>{t('admin.viewProfile.profileDetailsTitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><Fingerprint className="mr-2 h-4 w-4" />{t('auth.internalCodeLabel')}</p>
              <p className="text-lg font-mono tracking-wider bg-muted/50 px-3 py-1.5 rounded-md inline-block">{viewUser.internalCode || t('shared.notAvailable')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><User className="mr-2 h-4 w-4" />{t('auth.displayNameLabel')}</p>
              <p className="text-lg">{viewUser.displayName || t('shared.notAvailable')}</p>
            </div>
             <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><Mail className="mr-2 h-4 w-4" />{t('auth.emailLabel')}</p>
              <p className="text-lg">{viewUser.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"># {t('auth.rutLabel')}</p>
              <p className="text-lg">{viewUser.rut || t('shared.notAvailable')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><Phone className="mr-2 h-4 w-4" />{t('auth.phoneNumberLabel')}</p>
              <p className="text-lg">{viewUser.phoneNumber || t('shared.notAvailable')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><MapPin className="mr-2 h-4 w-4" />{t('auth.countryLabel')}</p>
              <p className="text-lg">{countryInfo?.name || t('shared.notAvailable')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground flex items-center"><CalendarDays className="mr-2 h-4 w-4" />{t('admin.tableHeaders.registrationDate')}</p>
              <p className="text-lg">
                {viewUser.registrationDate ? format(new Date(viewUser.registrationDate), 'PPpp', { locale: dateLocale }) : t('shared.notAvailable')}
              </p>
            </div>
          </div>
          <div className="space-y-3 pt-4 border-t">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{t('auth.roleLabel')}</p>
                <Badge variant={userRoleDisplay.variant} className="text-base px-3 py-1">
                    {userRoleDisplay.icon}
                    {userRoleDisplay.text}
                </Badge>
            </div>
            <div>
                <p className="text-sm font-medium text-muted-foreground">{t('auth.statusLabel')}</p>
                <Badge variant={statusInfo.variant} className={`text-base px-3 py-1 ${statusInfo.className}`}>
                    {statusInfo.icon}
                    {statusInfo.text}
                </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    