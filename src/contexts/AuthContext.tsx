
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from './LocalizationContext'; // Assuming you have t here for toasts

// Mocked Firebase User type or a simplified version
type MockFirebaseUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean;
  login: (data: LoginFormInput) => Promise<void>;
  signup: (data: SignupFormInput) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Simulate initial loading state
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations(); // For toast messages

  // Simulate checking auth state on mount
  useEffect(() => {
    setIsLoading(true);
    // In a real Firebase app, you'd use onAuthStateChanged here
    // For now, we simulate no user logged in or a mock user from localStorage
    const storedUser = localStorage.getItem('mockAuthUser');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('mockAuthUser');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (data: LoginFormInput) => {
    setIsLoading(true);
    console.log('Simulating login with:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful login
    const mockUser: AuthUser = {
      uid: 'mock-uid-' + Math.random().toString(36).substring(7),
      email: data.email,
      displayName: 'Usuario Ejemplo', // Or derive from email if desired
      rut: '12345678-9' // Mock RUT
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', {email: data.email}) });
    router.push('/'); // Redirect to home after login
  }, [router, toast, t]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setIsLoading(true);
    console.log('Simulating signup with:', data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate successful signup and login
    const mockUser: AuthUser = {
      uid: 'mock-uid-' + Math.random().toString(36).substring(7),
      email: data.email,
      displayName: data.displayName,
      rut: data.rut,
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    setIsLoading(false);
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t('auth.toast.signupSuccessDescription', {email: data.email}) });
    router.push('/'); // Redirect to home after signup
  }, [router, toast, t]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    console.log('Simulating logout');
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    localStorage.removeItem('mockAuthUser');
    setIsLoading(false);
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/'); // Redirect to home after logout
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async () => {
    console.log('Simulating login with Google');
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Google' }) });
    // In real app, call Firebase Google Auth provider
    // For now, simulate a successful login
    const mockUser: AuthUser = {
      uid: 'mock-google-uid-' + Math.random().toString(36).substring(7),
      email: 'googleuser@example.com',
      displayName: 'Google User',
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    router.push('/');
  }, [router, toast, t]);

  const loginWithApple = useCallback(async () => {
    console.log('Simulating login with Apple');
    toast({ title: t('auth.toast.providerLoginTitle'), description: t('auth.toast.providerLoginDescription', { provider: 'Apple' }) });
    // In real app, call Firebase Apple Auth provider
    // For now, simulate a successful login
     const mockUser: AuthUser = {
      uid: 'mock-apple-uid-' + Math.random().toString(36).substring(7),
      email: 'appleuser@example.com',
      displayName: 'Apple User',
    };
    setCurrentUser(mockUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(mockUser));
    router.push('/');
  }, [router, toast, t]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, signup, logout, loginWithGoogle, loginWithApple }}>
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
