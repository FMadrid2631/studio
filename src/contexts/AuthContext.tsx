
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
  login: (data: LoginFormInput) => Promise<void>;
  signup: (data: SignupFormInput) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  updateUserProfile: (data: EditProfileFormInput) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations(); 

  useEffect(() => {
    setIsLoading(true);
    const storedUser = localStorage.getItem('mockAuthUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as AuthUser;
        // Ensure role is set for older stored users
        if (!parsedUser.role) {
          parsedUser.role = parsedUser.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
        }
        setCurrentUser(parsedUser);
      } catch (e) {
        localStorage.removeItem('mockAuthUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (data: LoginFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const userRole = data.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const mockUser: AuthUser = {
      uid: 'mock-uid-' + Math.random().toString(36).substring(7),
      email: data.email,
      displayName: userRole === 'admin' ? 'Admin User' : 'Usuario Ejemplo', 
      rut: userRole === 'admin' ? '11111111-1' : '12345678-9',
      role: userRole
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', {email: data.email}) });
    router.push('/'); 
  }, [router, toast, t]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const userRole = data.email.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const mockUser: AuthUser = {
      uid: 'mock-uid-' + Math.random().toString(36).substring(7),
      email: data.email,
      displayName: data.displayName,
      rut: data.rut,
      role: userRole,
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t('auth.toast.signupSuccessDescription', {email: data.email}) });
    router.push('/'); 
  }, [router, toast, t]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    localStorage.removeItem('mockAuthUser');
    setIsLoading(false);
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/'); 
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate a Google login, check if it should be admin
    const googleEmail = 'googleuser@example.com'; // Example, could be dynamic if real OAuth
    const userRole = googleEmail.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const mockUser: AuthUser = {
      uid: 'mock-google-uid-' + Math.random().toString(36).substring(7),
      email: googleEmail,
      displayName: userRole === 'admin' ? 'Admin Google User' : 'Google User',
      role: userRole,
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Google' }) });
    router.push('/');
  }, [router, toast, t]);

  const loginWithApple = useCallback(async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Simulate an Apple login
    const appleEmail = 'appleuser@example.com';
    const userRole = appleEmail.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
    const mockUser: AuthUser = {
      uid: 'mock-apple-uid-' + Math.random().toString(36).substring(7),
      email: appleEmail,
      displayName: userRole === 'admin' ? 'Admin Apple User' : 'Apple User',
      role: userRole,
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Apple' }) });
    router.push('/');
  }, [router, toast, t]);

  const updateUserProfile = useCallback(async (data: EditProfileFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.updateProfileErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    
    const updatedUser = {
      ...currentUser,
      displayName: data.displayName,
      rut: data.rut,
      // Role is not changed during profile update
    };
    setCurrentUser(updatedUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(updatedUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.updateProfileSuccessTitle'), description: t('auth.toast.updateProfileSuccessDescription') });
    return true;
  }, [currentUser, toast, t]);


  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, signup, logout, loginWithGoogle, loginWithApple, updateUserProfile }}>
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

