
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle, Edit3, Save, X } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EditProfileFormInput } from '@/types';

const createEditProfileFormSchema = (t: Function) => z.object({
  displayName: z.string().min(2, { message: t('auth.validation.displayNameMin') }),
  rut: z.string().min(8, { message: t('auth.validation.rutMin') })
             .regex(/^[0-9]+-[0-9kK]$/, { message: t('auth.validation.rutFormat') }),
});

export default function ProfilePage() {
  const { currentUser, isLoading, logout, updateUserProfile } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const editProfileFormSchema = createEditProfileFormSchema(t);

  const form = useForm<EditProfileFormInput>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: {
      displayName: currentUser?.displayName || '',
      rut: currentUser?.rut || '',
    },
  });

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
    if (currentUser && !form.formState.isDirty) { // Reset form when currentUser changes and not editing
      form.reset({
        displayName: currentUser.displayName || '',
        rut: currentUser.rut || '',
      });
    }
  }, [currentUser, isLoading, router, form]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  const onSubmit = async (data: EditProfileFormInput) => {
    const success = await updateUserProfile(data);
    if (success) {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    form.reset({ // Reset form to original values
        displayName: currentUser.displayName || '',
        rut: currentUser.rut || '',
    });
    setIsEditing(false);
  };

  return (
    <div className="flex justify-center items-start pt-10 min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="items-center text-center">
          <div className="p-2 bg-primary/20 rounded-full inline-block mb-4">
            <UserCircle className="h-20 w-20 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            {isEditing ? t('auth.editProfileTitle') : (currentUser.displayName || t('auth.anonymousUser'))}
          </CardTitle>
          <CardDescription>{isEditing ? t('auth.editProfileSubtitle') : t('auth.profileSubtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.emailLabel')}</p>
                  <p className="text-lg py-2 px-3 border border-input rounded-md bg-muted/50 text-muted-foreground">{currentUser.email}</p>
                </div>
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
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    {t('auth.cancelButton')}
                  </Button>
                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('auth.saveChangesButton')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.displayNameLabel')}</p>
                  <p className="text-lg">{currentUser.displayName || t('shared.notAvailable')}</p>
                </div>
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
              </div>
              <Button variant="default" className="w-full mt-6" onClick={() => setIsEditing(true)}>
                <Edit3 className="mr-2 h-4 w-4" />
                {t('auth.editProfileButton')}
              </Button>
            </>
          )}
        </CardContent>
        {!isEditing && (
          <CardFooter className="flex-col space-y-2 pt-4">
             <Button variant="outline" className="w-full" onClick={logout}>
               {t('auth.logoutButton')}
             </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
