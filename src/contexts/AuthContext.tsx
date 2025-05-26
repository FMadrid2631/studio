
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput, EditProfileFormInput, ChangePasswordFormInput } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from './LocalizationContext';

const ADMIN_EMAIL = 'fernando.madrid21@hotmail.com';
const ALL_USERS_STORAGE_KEY = 'rifaFacilApp_allUsers';
const CURRENT_USER_STORAGE_KEY = 'mockAuthUser';

const generateInternalCode = () => `USER-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

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
  const [authIsLoading, setAuthIsLoading] = useState(true);
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations();
  const initialLoadComplete = useRef(false);


  // Effect for loading allUsers (runs once)
  useEffect(() => {
    let loadedUsers: AuthUser[] = [];
    let madeChanges = false;
    if (typeof window !== 'undefined') {
      const storedAllUsersJson = localStorage.getItem(ALL_USERS_STORAGE_KEY);
      if (storedAllUsersJson) {
        try {
          const parsedStoredUsers = JSON.parse(storedAllUsersJson) as Partial<AuthUser>[];
          loadedUsers = parsedStoredUsers.map(user => {
            const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            let statusChanged = false;
            let currentStatus = user.status || (isActualAdminByEmail ? 'active' : 'pending');
            let currentRole = user.role || (isActualAdminByEmail ? 'admin' : 'user');

            if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                if (currentRole !== 'admin') { currentRole = 'admin'; statusChanged = true; }
                if (currentStatus !== 'active') { currentStatus = 'active'; statusChanged = true; }
            }
            if(statusChanged) madeChanges = true;

            return {
              uid: user.uid || `mock-uid-${user.email || Math.random()}-${Date.now()}`,
              email: user.email || 'unknown@example.com',
              displayName: user.displayName || (isActualAdminByEmail ? 'Admin User' : ''),
              rut: user.rut,
              role: currentRole,
              status: currentStatus,
              registrationDate: user.registrationDate || new Date(0).toISOString(),
              countryCode: user.countryCode,
              phoneNumber: user.phoneNumber,
              internalCode: user.internalCode || generateInternalCode(),
            } as AuthUser;
          });
        } catch (e) {
          console.error("Error parsing allUsers from localStorage", e);
        }
      }
    }
    setAllUsers(loadedUsers);
    if (madeChanges && typeof window !== 'undefined') {
      localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(loadedUsers));
    }
  }, []);

  // Effect for loading currentUser and setting global loading state (depends on allUsers being loaded)
  useEffect(() => {
    if (initialLoadComplete.current) return; // Only run this logic once for initial load

    let userToSet: AuthUser | null = null;
    if (typeof window !== 'undefined') {
      const storedUserJson = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUserJson) {
        try {
          const parsedUser = JSON.parse(storedUserJson) as Partial<AuthUser>;
          if (parsedUser.uid && parsedUser.email) {
            let reconciledUser = allUsers.find(u => u.uid === parsedUser.uid);
            if (reconciledUser) {
              userToSet = { ...reconciledUser }; // Ensure we use the full object from allUsers
            } else {
              // Fallback if not in allUsers (e.g. allUsers was cleared but currentUser wasn't)
              const isActualAdminByEmail = parsedUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
              userToSet = {
                uid: parsedUser.uid,
                email: parsedUser.email,
                displayName: parsedUser.displayName || (isActualAdminByEmail ? 'Admin User' : ''),
                rut: parsedUser.rut,
                role: parsedUser.role || (isActualAdminByEmail ? 'admin' : 'user'),
                status: parsedUser.status || (isActualAdminByEmail ? 'active' : 'pending'),
                registrationDate: parsedUser.registrationDate || new Date(0).toISOString(),
                countryCode: parsedUser.countryCode,
                phoneNumber: parsedUser.phoneNumber,
                internalCode: parsedUser.internalCode || generateInternalCode(),
              } as AuthUser;
            }

            // Ensure admin role/status for the admin email, overriding if necessary
            if (userToSet && userToSet.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
              if (userToSet.role !== 'admin') userToSet.role = 'admin';
              if (userToSet.status !== 'active') userToSet.status = 'active';
            }
          }
        } catch (e) {
          console.error("Error processing stored currentUser:", e);
        }
      }
    }
    setCurrentUser(userToSet);
    setAuthIsLoading(false); // Signal that initial auth state is resolved
    initialLoadComplete.current = true;
  }, [allUsers]); // Run when allUsers is populated/updated.

  // Persist currentUser to localStorage
  useEffect(() => {
    if (!authIsLoading && typeof window !== 'undefined') { // authIsLoading check to prevent writing during initial load race
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    }
  }, [currentUser, authIsLoading]);

  // Persist allUsers to localStorage
  useEffect(() => {
    if (!authIsLoading && typeof window !== 'undefined') { // authIsLoading check
      localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsers));
    }
  }, [allUsers, authIsLoading]);


  const login = useCallback(async (data: LoginFormInput) => {
    // Local loading for button, not global authIsLoading
    // await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    let userInAllUsers = allUsers.find(u => u.email === userEmailLower);
    
    if (userInAllUsers) {
      const completeUser: AuthUser = {
        ...userInAllUsers,
        role: userInAllUsers.role || (userInAllUsers.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'),
        status: userInAllUsers.status || (userInAllUsers.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'active' : 'pending'),
        registrationDate: userInAllUsers.registrationDate || new Date(0).toISOString(),
        internalCode: userInAllUsers.internalCode || generateInternalCode(),
      };
      setCurrentUser(completeUser);
      // Ensure allUsers list is also up-to-date with this potentially more complete user object
      setAllUsers(prev => prev.map(u => u.uid === completeUser.uid ? completeUser : u));
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else if (userEmailLower === ADMIN_EMAIL.toLowerCase()) {
      // First time login for admin if not in allUsers
      const adminUser: AuthUser = {
        uid: 'mock-uid-' + userEmailLower,
        email: userEmailLower,
        displayName: 'Admin User',
        rut: '11111111-1',
        role: 'admin',
        status: 'active',
        registrationDate: new Date().toISOString(),
        countryCode: 'CL',
        phoneNumber: '123456789',
        internalCode: generateInternalCode(),
      };
      setCurrentUser(adminUser);
      setAllUsers(prev => {
          const existingAdminIndex = prev.findIndex(u => u.email === adminUser.email);
          if (existingAdminIndex !== -1) {
              const updated = [...prev];
              updated[existingAdminIndex] = adminUser;
              return updated;
          }
          return [...prev, adminUser];
      });
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle'), description: t('auth.toast.loginErrorDescription'), variant: 'destructive' });
    }
  }, [allUsers, router, t, toast]);

  const signup = useCallback(async (data: SignupFormInput) => {
    const userEmailLower = data.email.toLowerCase();
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
      internalCode: generateInternalCode(),
    };

    setAllUsers(prevAllUsers => {
        const existingUserIndex = prevAllUsers.findIndex(u => u.email === newUser.email);
        if (existingUserIndex !== -1) {
            const updatedUsers = [...prevAllUsers];
            updatedUsers[existingUserIndex] = newUser; 
            return updatedUsers;
        }
        const existingUserByUIDIndex = prevAllUsers.findIndex(u => u.uid === newUser.uid);
        if (existingUserByUIDIndex !== -1) {
            const updatedUsers = [...prevAllUsers];
            updatedUsers[existingUserByUIDIndex] = newUser;
            return updatedUsers;
        }
        return [...prevAllUsers, newUser];
    });

    setCurrentUser(newUser);

    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, { email: data.email }) });
    router.push('/');
  }, [router, t, toast]);

  const logout = useCallback(async () => {
    setCurrentUser(null);
    // localStorage.removeItem(CURRENT_USER_STORAGE_KEY); // Handled by useEffect for currentUser
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/');
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async () => {
    const googleEmail = 'googleuser@example.com';
    const existingUser = allUsers.find(u => u.email === googleEmail);
    const isActualAdmin = googleEmail === ADMIN_EMAIL.toLowerCase();

    if (!existingUser) {
        const googleData: SignupFormInput = {
            displayName: 'Google User',
            rut: isActualAdmin ? '11111111-1' : '00000000-0', 
            email: googleEmail,
            password_signup: 'password', 
            confirmPassword: 'password',
            countryCode: 'US',
            phoneNumber: '5551234'
        };
        await signup(googleData);
    } else {
        await login({email: googleEmail, password_login: 'password'});
    }
  }, [signup, login, allUsers]);

  const loginWithApple = useCallback(async () => {
    const appleEmail = 'appleuser@example.com';
    const existingUser = allUsers.find(u => u.email === appleEmail);
    const isActualAdmin = appleEmail === ADMIN_EMAIL.toLowerCase();

     if (!existingUser) {
        const appleData: SignupFormInput = {
            displayName: 'Apple User',
            rut: isActualAdmin ? '11111111-1' : '00000000-1', 
            email: appleEmail,
            password_signup: 'password',
            confirmPassword: 'password',
            countryCode: 'US',
            phoneNumber: '5555678'
        };
        await signup(appleData);
    } else {
        await login({email: appleEmail, password_login: 'password'});
    }
  }, [signup, login, allUsers]);

  const updateUserProfile = useCallback(async (data: EditProfileFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.updateProfileErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    
    const updatedUser = {
      ...currentUser,
      displayName: data.displayName,
      rut: data.rut,
    };
    setCurrentUser(updatedUser);
    setAllUsers(prevAllUsers =>
      prevAllUsers.map(u => u.uid === currentUser.uid ? updatedUser : u)
    );

    toast({ title: t('auth.toast.updateProfileSuccessTitle'), description: t('auth.toast.updateProfileSuccessDescription') });
    return true;
  }, [currentUser, t, toast]);

  const changePassword = useCallback(async (data: ChangePasswordFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.changePasswordErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
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
    let updatedUserName = userId;

    setAllUsers(prevAllUsers =>
      prevAllUsers.map(user => {
        if (user.uid === userId && user.status !== newStatus) {
          if (currentUser.uid === userId && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newStatus !== 'active') {
             toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: "Administrators cannot change their own status to non-active.", variant: 'destructive' });
             return user;
          }
          userWasUpdated = true;
          updatedUserName = user.displayName || userId;
          return { ...user, status: newStatus };
        }
        return user;
      })
    );

    if (userWasUpdated) {
      if (currentUser.uid === userId && currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) { 
        setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast({ title: t('admin.toast.statusUpdateSuccessTitle'), description: t('admin.toast.statusUpdateSuccessDescription', { userName: updatedUserName, newStatus: t(`admin.userStatus.${newStatus}`) }) });
      return true;
    } else {
      // Check if it failed because user tried to update admin self to non-active
      const targetUser = allUsers.find(u => u.uid === userId);
      if (!(targetUser && currentUser.uid === userId && targetUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newStatus !== 'active')) {
        toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      }
      return false;
    }
  }, [currentUser, allUsers, t, toast]);

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
  }, [currentUser, allUsers, t, toast]);

  const getUserById = useCallback((userIdToFind: string): AuthUser | undefined => {
    return allUsers.find(user => user.uid === userIdToFind);
  }, [allUsers]);

  return (
    <AuthContext.Provider value={{ currentUser, isLoading: authIsLoading, allUsers, login, signup, logout, loginWithGoogle, loginWithApple, updateUserProfile, changePassword, updateUserStatus, deleteUser, getUserById }}>
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
