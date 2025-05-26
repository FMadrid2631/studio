
'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslations } from '@/contexts/LocalizationContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { getLocaleFromString } from '@/lib/date-fns-locales';
import type { AuthUser } from '@/types';

export default function AdminUsersPage() {
  const { currentUser, allUsers, isLoading, updateUserStatus } = useAuth();
  const { t, locale } = useTranslations();
  const router = useRouter();
  const dateLocale = getLocaleFromString(locale);

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
    // Toast notification is handled within updateUserStatus in AuthContext
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
  
  const sortedUsers = [...allUsers].sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());


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
        {allUsers.length === 0 ? (
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
                  <TableHead>{t('admin.tableHeaders.name')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.email')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.rut')}</TableHead>
                  <TableHead>{t('admin.tableHeaders.registrationDate')}</TableHead>
                  <TableHead className="text-center">{t('admin.tableHeaders.status')}</TableHead>
                  <TableHead className="text-right">{t('admin.tableHeaders.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.displayName || t('shared.notAvailable')}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.rut || t('shared.notAvailable')}</TableCell>
                    <TableCell>
                      {format(new Date(user.registrationDate), 'PPpp', { locale: dateLocale })}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(user.status)}</TableCell>
                    <TableCell className="text-right">
                      <Select
                        defaultValue={user.status}
                        onValueChange={(newStatus: AuthUser['status']) => handleStatusChange(user.uid, newStatus)}
                        disabled={user.uid === currentUser.uid && currentUser.role === 'admin'} // Admin cannot change their own status via this UI
                      >
                        <SelectTrigger className="w-[120px] h-8 text-xs">
                          <SelectValue placeholder={t('admin.changeStatusPrompt')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('admin.userStatus.active')}</SelectItem>
                          <SelectItem value="pending">{t('admin.userStatus.pending')}</SelectItem>
                          <SelectItem value="inactive">{t('admin.userStatus.inactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
