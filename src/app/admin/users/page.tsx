
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { Loader2, Users, AlertTriangle, CheckCircle, XCircle, Clock, MoreVertical, ShieldCheck, User as UserIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import type { AuthUser } from '@/types';
import { COUNTRIES } from '@/lib/countries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdminUsersPage() {
  const { currentUser, allUsers, isLoading, updateUserStatus, deleteUser } = useAuth();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const dateLocale = getLocaleFromString(locale);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDeleteId, setUserToDeleteId] = useState<string | null>(null);
  const [userToDeleteName, setUserToDeleteName] = useState<string>('');

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== 'admin')) {
      router.replace('/');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || !currentUser || currentUser.role !== 'admin') {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="animate-spin rounded-full h-12 w-12 text-primary" />
      </div>
    );
  }

  const handleStatusChange = async (userId: string, newStatus: AuthUser['status']) => {
    await updateUserStatus(userId, newStatus);
  };

  const handleDeleteClick = (user: AuthUser) => {
    setUserToDeleteId(user.uid);
    setUserToDeleteName(user.displayName || user.email || 'Usuario');
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDeleteId) {
      await deleteUser(userToDeleteId);
      setIsDeleteDialogOpen(false);
      setUserToDeleteId(null);
      setUserToDeleteName('');
    }
  };

  const getStatusBadge = (status: AuthUser['status']) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white">
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.active')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-400 hover:bg-yellow-500 text-black">
            <Clock className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.pending')}
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="destructive" className="bg-gray-500 hover:bg-gray-600">
            <XCircle className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.inactive')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getRoleDisplay = (role?: 'admin' | 'user') => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="text-xs">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {t('auth.roleAdmin')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        <UserIcon className="mr-1 h-3.5 w-3.5" />
        {t('auth.roleUser')}
      </Badge>
    );
  };
  
  const sortedUsers = [...allUsers].sort((a, b) => new Date(b.registrationDate || 0).getTime() - new Date(a.registrationDate || 0).getTime());

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-3xl font-bold text-primary">{t('admin.usersPageTitle')}</CardTitle>
            <CardDescription>{t('admin.usersPageDescription')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedUsers.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">{t('admin.noUsersFound')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.noUsersFoundDescription')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.tableHeaders.actions')}</TableHead>
                  <TableHead className="text-center">{t('admin.tableHeaders.status')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.name')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.email')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.rut')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.phone')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.country')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.internalCode')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.role')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.registrationDate')}</TableHead>
                  <TableHead className="text-right"><span className="sr-only">{t('admin.actions.deleteUserItemText')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => {
                  const countryName = user.countryCode ? COUNTRIES.find(c => c.code === user.countryCode)?.name : t('shared.notAvailable');
                  return (
                  <TableRow key={user.uid}>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t('admin.actions.title')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('admin.actions.title')}</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger disabled={user.uid === currentUser.uid}>
                              {t('admin.actions.changeStatusTo')}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'active')}>
                                {t('admin.userStatus.active')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'pending')}>
                                {t('admin.userStatus.pending')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.uid, 'inactive')}>
                                {t('admin.userStatus.inactive')}
                              </DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="font-medium">{user.displayName || t('shared.notAvailable')}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.rut || t('shared.notAvailable')}</TableCell>
                    <TableCell>{user.phoneNumber || t('shared.notAvailable')}</TableCell>
                    <TableCell>{countryName}</TableCell>
                    <TableCell className="font-mono text-xs">{user.internalCode || t('shared.notAvailable')}</TableCell>
                    <TableCell>{getRoleDisplay(user.role)}</TableCell>
                    <TableCell>
                      {user.registrationDate ? format(new Date(user.registrationDate), 'PPpp', { locale: dateLocale }) : t('shared.notAvailable')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(user)}
                        disabled={user.uid === currentUser.uid}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title={t('admin.deleteUser.buttonTitle')}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t('admin.deleteUser.buttonTitle')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {isDeleteDialogOpen && (
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6 text-destructive" />
                {t('admin.deleteUser.dialogTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('admin.deleteUser.dialogDescription', { userName: userToDeleteName })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
                {t('admin.deleteUser.cancelButton')}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmDeleteUser} 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('admin.deleteUser.confirmButton')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}
