
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
  allUsers: AuthUser[]; // Exposed for admin page
  login: (data: LoginFormInput) => Promise<void>;
  signup: (data: SignupFormInput) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  updateUserProfile: (data: EditProfileFormInput) => Promise<boolean>;
  updateUserStatus: (userId: string, newStatus: AuthUser['status']) => Promise<boolean>; // Exposed for admin page
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
    localStorage.setItem('rifaFacilApp_allUsers', JSON.stringify(users));
    setAllUsers(users);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Load all users first
    const storedAllUsersJson = localStorage.getItem('rifaFacilApp_allUsers');
    let loadedAllUsers: AuthUser[] = [];
    if (storedAllUsersJson) {
      try {
        loadedAllUsers = JSON.parse(storedAllUsersJson);
      } catch (e) {
        console.error("Error parsing allUsers from localStorage", e);
      }
    }
    setAllUsers(loadedAllUsers);

    // Then load current user and ensure its data is complete
    const storedUserJson = localStorage.getItem('mockAuthUser');
    if (storedUserJson) {
      try {
        let user = JSON.parse(storedUserJson) as Partial<AuthUser>; // Parse as Partial initially
        let needsUpdateInStorage = false;

        if (!user.uid) { 
            throw new Error("Stored user is missing UID.");
        }

        // Ensure role
        if (!user.role) {
          user.role = user.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user';
          needsUpdateInStorage = true;
        }
        // Ensure status
        if (!user.status) {
          const userFromList = loadedAllUsers.find(u => u.uid === user.uid);
          user.status = userFromList?.status || (user.role === 'admin' ? 'active' : 'pending');
          needsUpdateInStorage = true;
        }
        // Ensure registrationDate
        if (!user.registrationDate) {
          const userFromList = loadedAllUsers.find(u => u.uid === user.uid);
          user.registrationDate = userFromList?.registrationDate || new Date(0).toISOString(); // Default to epoch
          needsUpdateInStorage = true;
        }
        
        user.displayName = user.displayName || (user.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo');
        // rut is optional

        setCurrentUser(user as AuthUser); 
        if (needsUpdateInStorage) {
          localStorage.setItem('mockAuthUser', JSON.stringify(user));
        }

      } catch (e) {
        console.error("Error processing stored user:", e);
        localStorage.removeItem('mockAuthUser'); 
      }
    }
    setIsLoading(false);
  }, []);


  const login = useCallback(async (data: LoginFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    const userEmailLower = data.email.toLowerCase();
    let userToLogin = allUsers.find(u => u.email === userEmailLower);
    let isNewAdminLogin = false;

    if (!userToLogin && userEmailLower === ADMIN_EMAIL) {
      // Admin logging in for the first time (or not in allUsers list for some reason)
      userToLogin = {
        uid: 'mock-uid-' + userEmailLower,
        email: userEmailLower,
        displayName: 'Admin User',
        rut: '11111111-1',
        role: 'admin',
        status: 'active',
        registrationDate: new Date().toISOString(),
      };
      isNewAdminLogin = true;
    }

    if (userToLogin) {
      // Ensure all fields are present, especially for older entries or direct admin login
      const completeUser: AuthUser = {
        ...userToLogin,
        role: userToLogin.role || (userToLogin.email?.toLowerCase() === ADMIN_EMAIL ? 'admin' : 'user'),
        status: userToLogin.status || (userToLogin.role === 'admin' ? 'active' : 'pending'),
        registrationDate: userToLogin.registrationDate || new Date().toISOString(),
        displayName: userToLogin.displayName || (userToLogin.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo'),
      };
      
      setCurrentUser(completeUser);
      localStorage.setItem('mockAuthUser', JSON.stringify(completeUser));
      
      if (isNewAdminLogin && !allUsers.find(u => u.uid === completeUser.uid)) {
        saveAllUsers([...allUsers, completeUser]);
      }
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', {email: data.email}) });
      router.push('/');
    } else {
      // User not found in allUsers and is not admin, simulate a failed login or redirect to signup
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
    };

    saveAllUsers([...allUsers, newUser]);
    setCurrentUser(newUser);
    localStorage.setItem('mockAuthUser', JSON.stringify(newUser));
    setIsLoading(false);
    
    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, {email: data.email}) });
    router.push('/'); 
  }, [allUsers, router, t, saveAllUsers]);

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
        };
        saveAllUsers([...allUsers, user]);
    }
    setCurrentUser(user);
    localStorage.setItem('mockAuthUser', JSON.stringify(user));
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
        };
        saveAllUsers([...allUsers, user]);
    }
    setCurrentUser(user);
    localStorage.setItem('mockAuthUser', JSON.stringify(user));
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
    localStorage.setItem('mockAuthUser', JSON.stringify(updatedUser));

    // Update in allUsers list as well
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
      // If the updated user is the current user, update currentUser state as well
      if (currentUser.uid === userId) {
        setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
        // Also update mockAuthUser in localStorage for consistency if current user is admin themselves
        localStorage.setItem('mockAuthUser', JSON.stringify(updatedAllUsers.find(u => u.uid === userId)));
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

