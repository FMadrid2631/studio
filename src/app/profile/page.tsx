
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Loader2, UserCircle, Edit3, Save, X, ShieldCheck, User, CheckCircle, AlertCircle, XCircle, Clock, Lock, Fingerprint } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EditProfileFormInput, ChangePasswordFormInput } from '@/types';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const createEditProfileFormSchema = (t: Function) => z.object({
  displayName: z.string().min(2, { message: t('auth.validation.displayNameMin') }),
  rut: z.string().min(8, { message: t('auth.validation.rutMin') })
             .regex(/^[0-9]+-[0-9kK]$/, { message: t('auth.validation.rutFormat') }),
});

const createChangePasswordFormSchema = (t: Function) => z.object({
  currentPassword_profile: z.string().min(1, { message: t('auth.validation.currentPasswordRequired') }), // In real app, min(6)
  newPassword_profile: z.string().min(6, { message: t('auth.validation.passwordMin') }),
  confirmNewPassword_profile: z.string().min(6, { message: t('auth.validation.passwordMin') })
}).refine(data => data.newPassword_profile === data.confirmNewPassword_profile, {
  message: t('auth.validation.passwordsNoMatch'),
  path: ["confirmNewPassword_profile"],
});


export default function ProfilePage() {
  const { currentUser, isLoading, logout, updateUserProfile, changePassword } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);

  const editProfileFormSchema = createEditProfileFormSchema(t);
  const changePasswordFormSchema = createChangePasswordFormSchema(t);

  const editForm = useForm<EditProfileFormInput>({
    resolver: zodResolver(editProfileFormSchema),
    defaultValues: {
      displayName: currentUser?.displayName || '',
      rut: currentUser?.rut || '',
    },
  });

  const passwordForm = useForm<ChangePasswordFormInput>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: {
      currentPassword_profile: '',
      newPassword_profile: '',
      confirmNewPassword_profile: '',
    },
  });

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.replace('/login');
    }
    if (currentUser && !editForm.formState.isDirty && isEditing) { 
      editForm.reset({
        displayName: currentUser.displayName || '',
        rut: currentUser.rut || '',
      });
    }
  }, [currentUser, isLoading, router, editForm, isEditing]);

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  const onSubmitEditProfile = async (data: EditProfileFormInput) => {
    const success = await updateUserProfile(data);
    if (success) {
      setIsEditing(false);
    }
  };

  const onSubmitChangePassword = async (data: ChangePasswordFormInput) => {
    const success = await changePassword(data);
    if (success) {
      setIsChangePasswordDialogOpen(false);
      passwordForm.reset();
    }
  };

  const handleCancelEdit = () => {
    editForm.reset({ 
        displayName: currentUser.displayName || '',
        rut: currentUser.rut || '',
    });
    setIsEditing(false);
  };

  const userRoleDisplay = currentUser.role === 'admin' 
    ? { text: t('auth.roleAdmin'), icon: <ShieldCheck className="mr-1 h-4 w-4 text-primary" />, variant: 'default' as const } 
    : { text: t('auth.roleUser'), icon: <User className="mr-1 h-4 w-4 text-muted-foreground" />, variant: 'secondary' as const };

  const userStatusDisplay = () => {
    switch (currentUser.status) {
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
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEditProfile)} className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.emailLabel')}</p>
                  <p className="text-lg py-2 px-3 border border-input bg-input-background rounded-md text-muted-foreground">{currentUser.email}</p>
                </div>
                <FormField
                  control={editForm.control}
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
                  control={editForm.control}
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
                  <Button type="submit" className="w-full" disabled={editForm.formState.isSubmitting}>
                    {editForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {t('auth.saveChangesButton')}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                 <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.internalCodeLabel')}</p>
                  <p className="text-lg font-mono tracking-wider bg-muted/50 px-3 py-1.5 rounded-md inline-block">{currentUser.internalCode || t('shared.notAvailable')}</p>
                </div>
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
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('auth.roleLabel')}</p>
                  <Badge variant={userRoleDisplay.variant} className="text-base px-3 py-1">
                    {userRoleDisplay.icon}
                    {userRoleDisplay.text}
                  </Badge>
                </div>
                {currentUser.status && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('auth.statusLabel')}</p>
                    <Badge variant={statusInfo.variant} className={`text-base px-3 py-1 ${statusInfo.className}`}>
                      {statusInfo.icon}
                      {statusInfo.text}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="space-y-2 mt-8">
                <Button variant="default" className="w-full" onClick={() => setIsEditing(true)}>
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t('auth.editProfileButton')}
                </Button>
                 <AlertDialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Lock className="mr-2 h-4 w-4" />
                      {t('auth.changePasswordButton')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('auth.changePasswordDialog.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('auth.changePasswordDialog.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <Form {...passwordForm}>
                      <form onSubmit={passwordForm.handleSubmit(onSubmitChangePassword)} className="space-y-4">
                        <FormField
                          control={passwordForm.control}
                          name="currentPassword_profile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.changePasswordDialog.currentPasswordLabel')}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="newPassword_profile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.changePasswordDialog.newPasswordLabel')}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmNewPassword_profile"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('auth.changePasswordDialog.confirmNewPasswordLabel')}</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <AlertDialogFooter className="pt-4">
                          <AlertDialogCancel onClick={() => passwordForm.reset()}>{t('auth.cancelButton')}</AlertDialogCancel>
                          <AlertDialogAction type="submit" disabled={passwordForm.formState.isSubmitting}>
                             {passwordForm.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {t('auth.changePasswordDialog.submitButton')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </form>
                    </Form>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </CardContent>
        {!isEditing && (
          <CardFooter className="flex-col space-y-2 pt-6 border-t mt-6">
             <Button variant="outline" className="w-full" onClick={logout}>
               {t('auth.logoutButton')}
             </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
