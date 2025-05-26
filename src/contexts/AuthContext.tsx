
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput, EditProfileFormInput } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from './LocalizationContext'; 

const ADMIN_EMAIL = 'fernando.madrid21@hotmail.com';

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
  updateUserStatus: (userId: string, newStatus: AuthUser['status']) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations(); 

  const saveAllUsers = useCallback((users: AuthUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rifaFacilApp_allUsers', JSON.stringify(users));
    }
    setAllUsers(users);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    let loadedAllUsers: AuthUser[] = [];
    if (typeof window !== 'undefined') {
      const storedAllUsersJson = localStorage.getItem('rifaFacilApp_allUsers');
      if (storedAllUsersJson) {
        try {
          loadedAllUsers = JSON.parse(storedAllUsersJson);
        } catch (e) {
          console.error("Error parsing allUsers from localStorage", e);
        }
      }
    }
    setAllUsers(loadedAllUsers);

    if (typeof window !== 'undefined') {
      const storedUserJson = localStorage.getItem('mockAuthUser');
      if (storedUserJson) {
        try {
          let user = JSON.parse(storedUserJson) as Partial<AuthUser>;
          let needsUpdateInStorage = false;

          if (!user.uid || !user.email) { 
              throw new Error("Stored user is missing UID or email.");
          }

          const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL;

          if (isActualAdminByEmail) {
              if (user.role !== 'admin') {
                  user.role = 'admin';
                  needsUpdateInStorage = true;
              }
          } else {
              if (user.role !== 'user') {
                  user.role = 'user';
                  needsUpdateInStorage = true;
              }
          }
          
          if (!user.status) {
            const userFromList = loadedAllUsers.find(u => u.uid === user.uid);
            user.status = userFromList?.status || (user.role === 'admin' ? 'active' : 'pending');
            needsUpdateInStorage = true;
          }
          if (!user.registrationDate) {
            const userFromList = loadedAllUsers.find(u => u.uid === user.uid);
            user.registrationDate = userFromList?.registrationDate || new Date(0).toISOString(); // Default to epoch if not found
            needsUpdateInStorage = true;
          }
          
          user.displayName = user.displayName || (user.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo');
          // rut, countryCode, phoneNumber are optional and might not exist for older users

          setCurrentUser(user as AuthUser); 
          if (needsUpdateInStorage) {
            localStorage.setItem('mockAuthUser', JSON.stringify(user));
            const userInAllUsersIndex = loadedAllUsers.findIndex(u => u.uid === user.uid);
            if (userInAllUsersIndex > -1) {
                loadedAllUsers[userInAllUsersIndex] = user as AuthUser;
            } else {
                loadedAllUsers.push(user as AuthUser);
            }
            saveAllUsers([...loadedAllUsers]);
          }

        } catch (e) {
          console.error("Error processing stored user:", e);
          localStorage.removeItem('mockAuthUser'); 
        }
      }
    }
    setIsLoading(false);
  }, [saveAllUsers]);


  const login = useCallback(async (data: LoginFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    const userEmailLower = data.email.toLowerCase();
    let userToLogin = allUsers.find(u => u.email === userEmailLower);
    let isNewAdminLogin = false;

    if (!userToLogin && userEmailLower === ADMIN_EMAIL) {
      userToLogin = {
        uid: 'mock-uid-' + userEmailLower,
        email: userEmailLower,
        displayName: 'Admin User',
        rut: '11111111-1',
        role: 'admin',
        status: 'active',
        registrationDate: new Date().toISOString(),
        countryCode: 'CL', // Default for admin example
        phoneNumber: '123456789' // Default for admin example
      };
      isNewAdminLogin = true;
    }

    if (userToLogin) {
      const completeUser: AuthUser = {
        ...userToLogin,
        role: userToLogin.role || (userToLogin.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user'),
        status: userToLogin.status || (userToLogin.role === 'admin' ? 'active' : 'pending'),
        registrationDate: userToLogin.registrationDate || new Date().toISOString(),
        displayName: userToLogin.displayName || (userToLogin.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo'),
        // Ensure countryCode and phoneNumber are present, even if undefined
        countryCode: userToLogin.countryCode,
        phoneNumber: userToLogin.phoneNumber,
      };
      
      setCurrentUser(completeUser);
      if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(completeUser));
      
      if (isNewAdminLogin && !allUsers.find(u => u.uid === completeUser.uid)) {
        saveAllUsers([...allUsers, completeUser]);
      } else if (allUsers.find(u => u.uid === completeUser.uid && (u.role !== completeUser.role || u.status !== completeUser.status))) {
        const updatedAll = allUsers.map(u => u.uid === completeUser.uid ? completeUser : u);
        saveAllUsers(updatedAll);
      }

      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', {email: data.email}) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle', {defaultValue: "Login Failed"}), description: t('auth.toast.loginErrorDescription', {defaultValue: "User not found or credentials incorrect."}), variant: 'destructive' });
    }
    setIsLoading(false);
  }, [allUsers, router, t, saveAllUsers]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    if (allUsers.find(u => u.email === userEmailLower)) {
        toast({ title: t('auth.toast.signupErrorTitle', {defaultValue: "Signup Failed"}), description: t('auth.toast.signupErrorEmailExists', {defaultValue: "This email is already registered."}), variant: 'destructive' });
        setIsLoading(false);
        return;
    }

    const userRole = userEmailLower === ADMIN_EMAIL ? 'admin' : 'user';
    const newUserStatus = userRole === 'admin' ? 'active' : 'pending';

    const newUser: AuthUser = {
      uid: 'mock-uid-' + userEmailLower, 
      email: userEmailLower,
      displayName: data.displayName,
      rut: data.rut,
      role: userRole,
      status: newUserStatus,
      registrationDate: new Date().toISOString(),
      countryCode: data.countryCode,
      phoneNumber: data.phoneNumber,
    };

    saveAllUsers([...allUsers, newUser]);
    setCurrentUser(newUser);
    if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(newUser));
    setIsLoading(false);
    
    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, {email: data.email}) });
    router.push('/'); 
  }, [allUsers, router, t, saveAllUsers]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    if (typeof window !== 'undefined') localStorage.removeItem('mockAuthUser');
    setIsLoading(false);
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/'); 
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const googleEmail = 'googleuser@example.com'; 
    let user = allUsers.find(u => u.email === googleEmail);
    if (!user) {
        user = {
            uid: 'mock-google-uid-' + Math.random().toString(36).substring(7),
            email: googleEmail,
            displayName: 'Google User',
            role: googleEmail.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
            status: googleEmail.toLowerCase() === ADMIN_EMAIL ? 'active' : 'pending',
            registrationDate: new Date().toISOString(),
            countryCode: 'US', // Example default
            phoneNumber: '5551234' // Example default
        };
        saveAllUsers([...allUsers, user]);
    }
    setCurrentUser(user);
    if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(user));
    setIsLoading(false);
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Google' }) });
    router.push('/');
  }, [router, toast, t, allUsers, saveAllUsers]);

  const loginWithApple = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const appleEmail = 'appleuser@example.com';
    let user = allUsers.find(u => u.email === appleEmail);
    if (!user) {
        user = {
            uid: 'mock-apple-uid-' + Math.random().toString(36).substring(7),
            email: appleEmail,
            displayName: 'Apple User',
            role: appleEmail.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user',
            status: appleEmail.toLowerCase() === ADMIN_EMAIL ? 'active' : 'pending',
            registrationDate: new Date().toISOString(),
            countryCode: 'US', // Example default
            phoneNumber: '5555678' // Example default
        };
        saveAllUsers([...allUsers, user]);
    }
    setCurrentUser(user);
    if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(user));
    setIsLoading(false);
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Apple' }) });
    router.push('/');
  }, [router, toast, t, allUsers, saveAllUsers]);

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
    if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(updatedUser));

    const updatedAllUsers = allUsers.map(u => u.uid === currentUser.uid ? updatedUser : u);
    saveAllUsers(updatedAllUsers);

    setIsLoading(false);
    toast({ title: t('auth.toast.updateProfileSuccessTitle'), description: t('auth.toast.updateProfileSuccessDescription') });
    return true;
  }, [currentUser, toast, t, allUsers, saveAllUsers]);

  const updateUserStatus = useCallback(async (userId: string, newStatus: AuthUser['status']): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorNotAdmin', {defaultValue: "Only admins can change user status."}), variant: 'destructive' });
      return false;
    }
    let userUpdated = false;
    const updatedAllUsers = allUsers.map(user => {
      if (user.uid === userId) {
        userUpdated = true;
        return { ...user, status: newStatus };
      }
      return user;
    });

    if (userUpdated) {
      saveAllUsers(updatedAllUsers);
      if (currentUser.uid === userId) {
        const updatedCurrentUser = { ...currentUser, status: newStatus };
        setCurrentUser(updatedCurrentUser);
        if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(updatedCurrentUser));
      }
      const targetUser = allUsers.find(u => u.uid === userId);
      toast({ title: t('admin.toast.statusUpdateSuccessTitle'), description: t('admin.toast.statusUpdateSuccessDescription', { userName: targetUser?.displayName || userId, newStatus: t(`admin.userStatus.${newStatus}`)}) });
      return true;
    } else {
      toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound', { defaultValue: "User not found."}), variant: 'destructive' });
      return false;
    }
  }, [currentUser, allUsers, saveAllUsers, toast, t]);


  return (
    <AuthContext.Provider value={{ currentUser, isLoading, allUsers, login, signup, logout, loginWithGoogle, loginWithApple, updateUserProfile, updateUserStatus }}>
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
