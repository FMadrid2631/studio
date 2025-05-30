
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  // DropdownMenuLabel, // Removed as per request
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const [searchTerm, setSearchTerm] = useState('');

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
    setUserToDeleteName(user.displayName || user.email || t('auth.anonymousUser'));
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
          <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white whitespace-nowrap">
            <CheckCircle className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.active')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-400 hover:bg-yellow-500 text-black whitespace-nowrap">
            <Clock className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.pending')}
          </Badge>
        );
      case 'inactive':
        return (
          <Badge variant="destructive" className="bg-gray-500 hover:bg-gray-600 whitespace-nowrap">
            <XCircle className="mr-1 h-3.5 w-3.5" />
            {t('admin.userStatus.inactive')}
          </Badge>
        );
      default:
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
    }
  };

  const getRoleDisplay = (role?: 'admin' | 'user') => {
    if (role === 'admin') {
      return (
        <Badge variant="default" className="text-xs whitespace-nowrap">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {t('auth.roleAdmin')}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs whitespace-nowrap">
        <UserIcon className="mr-1 h-3.5 w-3.5" />
        {t('auth.roleUser')}
      </Badge>
    );
  };
  
  const sortedUsers = [...allUsers].sort((a, b) => new Date(b.registrationDate || 0).getTime() - new Date(a.registrationDate || 0).getTime());

  const displayedUsers = sortedUsers.filter(user => {
    const term = searchTerm.toLowerCase();
    const countryName = user.countryCode ? COUNTRIES.find(c => c.code === user.countryCode)?.name.toLowerCase() : '';
    const statusText = user.status ? t(`admin.userStatus.${user.status}`).toLowerCase() : '';
    const roleText = user.role ? t(user.role === 'admin' ? 'auth.roleAdmin' : 'auth.roleUser').toLowerCase() : '';

    return (
      user.displayName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.rut?.toLowerCase().includes(term) ||
      user.internalCode?.toLowerCase().includes(term) ||
      user.phoneNumber?.toLowerCase().includes(term) ||
      countryName.includes(term) ||
      statusText.includes(term) ||
      roleText.includes(term)
    );
  });

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
        <div className="mb-4">
          <Input
            type="text"
            placeholder={t('admin.usersPage.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {allUsers.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">{t('admin.noUsersFound')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.noUsersFoundDescription')}</p>
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">{t('admin.noUsersMatchSearch')}</p>
            <p className="text-sm text-muted-foreground">{t('admin.usersPage.searchClearHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.actions')}</TableHead>
                  <TableHead className="text-center whitespace-nowrap">{t('admin.tableHeaders.status')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.name')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.email')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.rut')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.phone')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.country')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.internalCode')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.role')}</TableHead>
                  <TableHead className="whitespace-nowrap">{t('admin.tableHeaders.registrationDate')}</TableHead>
                  <TableHead className="text-right whitespace-nowrap"><span className="sr-only">{t('admin.deleteUser.deleteUserItemText')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.map((user) => {
                  const countryName = user.countryCode ? COUNTRIES.find(c => c.code === user.countryCode)?.name : t('shared.notAvailable');
                  return (
                  <TableRow key={user.uid}>
                    <TableCell className="whitespace-nowrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t('admin.actions.title')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* <DropdownMenuLabel>{t('admin.actions.title')}</DropdownMenuLabel> */}
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(user.uid, 'active')}
                            disabled={user.uid === currentUser.uid && user.email?.toLowerCase() === t('auth.adminEmailValue').toLowerCase()}
                          >
                            {t('admin.userStatus.active')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(user.uid, 'pending')}
                            disabled={user.uid === currentUser.uid && user.email?.toLowerCase() === t('auth.adminEmailValue').toLowerCase()}
                          >
                            {t('admin.userStatus.pending')}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleStatusChange(user.uid, 'inactive')}
                            disabled={user.uid === currentUser.uid && user.email?.toLowerCase() === t('auth.adminEmailValue').toLowerCase()}
                          >
                            {t('admin.userStatus.inactive')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{user.displayName || t('shared.notAvailable')}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.rut || t('shared.notAvailable')}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.phoneNumber || t('shared.notAvailable')}</TableCell>
                    <TableCell className="whitespace-nowrap">{countryName}</TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{user.internalCode || t('shared.notAvailable')}</TableCell>
                    <TableCell className="whitespace-nowrap">{getRoleDisplay(user.role)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {user.registrationDate ? format(new Date(user.registrationDate), 'PPpp', { locale: dateLocale }) : t('shared.notAvailable')}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
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

