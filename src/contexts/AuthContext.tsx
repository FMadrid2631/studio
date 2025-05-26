
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput, EditProfileFormInput, ChangePasswordFormInput } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from './LocalizationContext';

const ADMIN_EMAIL = 'fernando.madrid21@hotmail.com';
const ALL_USERS_STORAGE_KEY = 'rifaFacilApp_allUsers';
const CURRENT_USER_STORAGE_KEY = 'mockAuthUser';

interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  allUsers: AuthUser[];
  login: (data: LoginFormInput) => Promise<void>;
  signup: (data: SignupFormInput) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  updateUserProfile: (data: EditProfileFormInput) => Promise<boolean>;
  changePassword: (data: ChangePasswordFormInput) => Promise<boolean>;
  updateUserStatus: (userId: string, newStatus: AuthUser['status']) => Promise<boolean>;
  deleteUser: (userIdToDelete: string) => Promise<boolean>;
  getUserById: (userId: string) => AuthUser | undefined;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Load initial state from localStorage
  useEffect(() => {
    setIsLoading(true);
    let loadedAllUsers: AuthUser[] = [];
    if (typeof window !== 'undefined') {
      const storedAllUsersJson = localStorage.getItem(ALL_USERS_STORAGE_KEY);
      if (storedAllUsersJson) {
        try {
          loadedAllUsers = JSON.parse(storedAllUsersJson);
        } catch (e) {
          console.error("Error parsing allUsers from localStorage", e);
        }
      }
    }
    // Perform migrations or ensure essential fields on loaded users
    const migratedUsers = loadedAllUsers.map(user => {
      const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      let updatedUser = { ...user };
      updatedUser.role = isActualAdminByEmail ? 'admin' : 'user';
      updatedUser.status = user.status || (isActualAdminByEmail ? 'active' : 'pending');
      updatedUser.registrationDate = user.registrationDate || new Date(0).toISOString();
      return updatedUser;
    });
    setAllUsers(migratedUsers);

    if (typeof window !== 'undefined') {
      const storedUserJson = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUserJson) {
        try {
          let userToSet = JSON.parse(storedUserJson) as Partial<AuthUser>;
          if (!userToSet.uid || !userToSet.email) {
            setCurrentUser(null);
          } else {
            const isActualAdminByEmail = userToSet.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            userToSet.role = isActualAdminByEmail ? 'admin' : 'user';
            
            const userFromMigratedList = migratedUsers.find(u => u.uid === userToSet.uid);
            userToSet.status = userFromMigratedList?.status || userToSet.status || (isActualAdminByEmail ? 'active' : 'pending');
            userToSet.registrationDate = userFromMigratedList?.registrationDate || userToSet.registrationDate || new Date(0).toISOString();
            userToSet.displayName = userToSet.displayName || userFromMigratedList?.displayName || (isActualAdminByEmail ? 'Admin User' : 'Usuario Ejemplo');
            userToSet.rut = userToSet.rut || userFromMigratedList?.rut;
            userToSet.countryCode = userToSet.countryCode || userFromMigratedList?.countryCode;
            userToSet.phoneNumber = userToSet.phoneNumber || userFromMigratedList?.phoneNumber;
            
            setCurrentUser(userToSet as AuthUser);
          }
        } catch (e) {
          console.error("Error processing stored user:", e);
          setCurrentUser(null);
        }
      }
    }
    setIsLoading(false);
  }, []);

  // Persist allUsers to localStorage
  useEffect(() => {
    if (!isLoading) { // Avoid writing initial empty array if still loading
      if (typeof window !== 'undefined') {
        localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsers));
      }
    }
  }, [allUsers, isLoading]);

  // Persist currentUser to localStorage
  useEffect(() => {
    if (!isLoading) { // Avoid writing initial null if still loading
      if (typeof window !== 'undefined') {
        if (currentUser) {
          localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
        } else {
          localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        }
      }
    }
  }, [currentUser, isLoading]);


  const login = useCallback(async (data: LoginFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    let userToLogin = allUsers.find(u => u.email === userEmailLower);
    
    if (userToLogin) {
      // Ensure all fields are present, especially role and status from the allUsers list
      const completeUser: AuthUser = {
        uid: userToLogin.uid,
        email: userToLogin.email,
        displayName: userToLogin.displayName || (userToLogin.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo'),
        rut: userToLogin.rut,
        role: userToLogin.role || (userToLogin.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'),
        status: userToLogin.status || (userToLogin.role === 'admin' ? 'active' : 'pending'),
        registrationDate: userToLogin.registrationDate || new Date().toISOString(),
        countryCode: userToLogin.countryCode,
        phoneNumber: userToLogin.phoneNumber,
      };
      setCurrentUser(completeUser);
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else if (userEmailLower === ADMIN_EMAIL.toLowerCase()) {
      // Special case: Admin logs in for the first time (not in allUsers yet)
      const adminUser: AuthUser = {
        uid: 'mock-uid-' + userEmailLower,
        email: userEmailLower,
        displayName: 'Admin User',
        rut: '11111111-1',
        role: 'admin',
        status: 'active',
        registrationDate: new Date().toISOString(),
        countryCode: 'CL',
        phoneNumber: '123456789'
      };
      setAllUsers(prev => {
          const existing = prev.find(u => u.email === adminUser.email);
          return existing ? prev : [...prev, adminUser];
      });
      setCurrentUser(adminUser);
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle'), description: t('auth.toast.loginErrorDescription'), variant: 'destructive' });
    }
    setIsLoading(false);
  }, [allUsers, router, t, toast]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    if (allUsers.find(u => u.email === userEmailLower)) {
      toast({ title: t('auth.toast.signupErrorTitle'), description: t('auth.toast.signupErrorEmailExists'), variant: 'destructive' });
      setIsLoading(false);
      return;
    }

    const userRole = userEmailLower === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    const newUserStatus = userRole === 'admin' ? 'active' : 'pending';

    const newUser: AuthUser = {
      uid: 'mock-uid-' + userEmailLower + '-' + Math.random().toString(36).substring(2, 7),
      email: userEmailLower,
      displayName: data.displayName,
      rut: data.rut,
      role: userRole,
      status: newUserStatus,
      registrationDate: new Date().toISOString(),
      countryCode: data.countryCode,
      phoneNumber: data.phoneNumber,
    };

    setAllUsers(prevAllUsers => [...prevAllUsers, newUser]);
    setCurrentUser(newUser);
    setIsLoading(false);

    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, { email: data.email }) });
    router.push('/');
  }, [allUsers, router, t, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    // No need to clear allUsers, they persist unless explicitly deleted
    setIsLoading(false);
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/');
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async () => {
    // Simplified: uses the signup flow with predefined data
    const googleData: SignupFormInput = {
        displayName: 'Google User',
        rut: '00000000-0', // Placeholder
        email: 'googleuser@example.com',
        password_signup: 'password', // Mock
        countryCode: 'US',
        phoneNumber: '5551234'
    };
    // Check if user exists, otherwise sign them up
    if (!allUsers.find(u => u.email === googleData.email)) {
        await signup(googleData);
    } else {
        await login({email: googleData.email, password_login: 'password'});
    }
  }, [signup, login, allUsers]);

  const loginWithApple = useCallback(async () => {
    // Simplified: uses the signup flow with predefined data
    const appleData: SignupFormInput = {
        displayName: 'Apple User',
        rut: '00000000-1', // Placeholder
        email: 'appleuser@example.com',
        password_signup: 'password', // Mock
        countryCode: 'US',
        phoneNumber: '5555678'
    };
     if (!allUsers.find(u => u.email === appleData.email)) {
        await signup(appleData);
    } else {
        await login({email: appleData.email, password_login: 'password'});
    }
  }, [signup, login, allUsers]);

  const updateUserProfile = useCallback(async (data: EditProfileFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.updateProfileErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const updatedUser = {
      ...currentUser,
      displayName: data.displayName,
      rut: data.rut,
    };
    setCurrentUser(updatedUser);
    setAllUsers(prevAllUsers =>
      prevAllUsers.map(u => u.uid === currentUser.uid ? updatedUser : u)
    );

    setIsLoading(false);
    toast({ title: t('auth.toast.updateProfileSuccessTitle'), description: t('auth.toast.updateProfileSuccessDescription') });
    return true;
  }, [currentUser, t, toast]);

  const changePassword = useCallback(async (data: ChangePasswordFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.changePasswordErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    console.log("Simulating password change for user:", currentUser.email);
    console.log("New password (mock):", data.newPassword_profile);
    await new Promise(resolve => setTimeout(resolve, 700));
    toast({ title: t('auth.toast.changePasswordSuccessTitle'), description: t('auth.toast.changePasswordSuccessDescription') });
    return true;
  }, [currentUser, t, toast]);

  const updateUserStatus = useCallback(async (userId: string, newStatus: AuthUser['status']): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorNotAdmin'), variant: 'destructive' });
      return false;
    }
    let userWasUpdated = false;
    setAllUsers(prevAllUsers =>
      prevAllUsers.map(user => {
        if (user.uid === userId && user.status !== newStatus) {
          userWasUpdated = true;
          return { ...user, status: newStatus };
        }
        return user;
      })
    );

    if (userWasUpdated) {
      if (currentUser.uid === userId) { // If admin changes their own status (though UI prevents some of this)
        setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
      const targetUser = allUsers.find(u => u.uid === userId); // Find from previous state for name
      toast({ title: t('admin.toast.statusUpdateSuccessTitle'), description: t('admin.toast.statusUpdateSuccessDescription', { userName: targetUser?.displayName || userId, newStatus: t(`admin.userStatus.${newStatus}`) }) });
      return true;
    } else {
      const targetUserExists = allUsers.some(u => u.uid === userId);
      if (!targetUserExists) {
        toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      } // else, no change was needed
      return false;
    }
  }, [currentUser, allUsers, t, toast]); // allUsers needed for find

  const deleteUser = useCallback(async (userIdToDelete: string): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.statusUpdateErrorNotAdmin'), variant: 'destructive' });
      return false;
    }
    if (currentUser.uid === userIdToDelete) {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.deleteErrorSelf'), variant: 'destructive' });
      return false;
    }

    const userToDelete = allUsers.find(user => user.uid === userIdToDelete);
    if (!userToDelete) {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      return false;
    }

    setAllUsers(prevAllUsers => prevAllUsers.filter(user => user.uid !== userIdToDelete));
    toast({ title: t('admin.toast.deleteSuccessTitle'), description: t('admin.toast.deleteSuccessDescription', { userName: userToDelete.displayName || userIdToDelete }) });
    return true;
  }, [currentUser, allUsers, t, toast]); // allUsers needed for find

  const getUserById = useCallback((userId: string): AuthUser | undefined => {
    return allUsers.find(user => user.uid === userId);
  }, [allUsers]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, allUsers, login, signup, logout, loginWithGoogle, loginWithApple, updateUserProfile, changePassword, updateUserStatus, deleteUser, getUserById }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
