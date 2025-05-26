
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput, EditProfileFormInput, ChangePasswordFormInput } from '@/types';
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
    
    let usersChangedDuringMigration = false;
    const migratedUsers = loadedAllUsers.map(user => {
      let needsUpdate = false;
      const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      let updatedUser = { ...user };

      if (isActualAdminByEmail) {
        if (updatedUser.role !== 'admin') {
          updatedUser.role = 'admin';
          needsUpdate = true;
        }
      } else {
        if (updatedUser.role !== 'user') {
          updatedUser.role = 'user';
          needsUpdate = true;
        }
      }
      if (!updatedUser.status) {
        updatedUser.status = isActualAdminByEmail ? 'active' : 'pending';
        needsUpdate = true;
      }
      if (!updatedUser.registrationDate) {
        updatedUser.registrationDate = new Date(0).toISOString();
        needsUpdate = true;
      }
      if(needsUpdate) usersChangedDuringMigration = true;
      return updatedUser;
    });

    setAllUsers(migratedUsers);
    if (usersChangedDuringMigration || (loadedAllUsers.length === 0 && migratedUsers.length > 0) || (loadedAllUsers.length > 0 && migratedUsers.length === 0 && !localStorage.getItem('rifaFacilApp_allUsers'))) {
        saveAllUsers(migratedUsers); 
    }


    if (typeof window !== 'undefined') {
      const storedUserJson = localStorage.getItem('mockAuthUser');
      if (storedUserJson) {
        try {
          let user = JSON.parse(storedUserJson) as Partial<AuthUser>;
          let needsUpdateInStorage = false;

          if (!user.uid || !user.email) { 
              localStorage.removeItem('mockAuthUser');
              setIsLoading(false);
              return;
          }

          const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          let roleToSet = isActualAdminByEmail ? 'admin' : 'user';
          if (user.role !== roleToSet) {
              user.role = roleToSet;
              needsUpdateInStorage = true;
          }
          
          const userFromList = migratedUsers.find(u => u.uid === user.uid);

          if (!user.status) {
            user.status = userFromList?.status || (isActualAdminByEmail ? 'active' : 'pending');
            needsUpdateInStorage = true;
          } else if (userFromList && user.status !== userFromList.status) {
             user.status = userFromList.status;
             needsUpdateInStorage = true;
          }

          if (!user.registrationDate) {
            user.registrationDate = userFromList?.registrationDate || new Date(0).toISOString(); 
            needsUpdateInStorage = true;
          }
          
          user.displayName = user.displayName || userFromList?.displayName || (isActualAdminByEmail ? 'Admin User' : 'Usuario Ejemplo');
          
          user.rut = user.rut || userFromList?.rut;
          user.countryCode = user.countryCode || userFromList?.countryCode;
          user.phoneNumber = user.phoneNumber || userFromList?.phoneNumber;


          setCurrentUser(user as AuthUser); 
          if (needsUpdateInStorage) {
            localStorage.setItem('mockAuthUser', JSON.stringify(user));
            const userInAllUsersIndex = migratedUsers.findIndex(u => u.uid === user.uid);
            if (userInAllUsersIndex > -1) {
                migratedUsers[userInAllUsersIndex] = user as AuthUser;
                saveAllUsers([...migratedUsers]);
            }
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

    if (!userToLogin && userEmailLower === ADMIN_EMAIL.toLowerCase()) {
      userToLogin = {
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
      isNewAdminLogin = true;
    }

    if (userToLogin) {
      const completeUser: AuthUser = {
        ...userToLogin,
        role: userToLogin.role || (userToLogin.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user'),
        status: userToLogin.status || (userToLogin.role === 'admin' ? 'active' : 'pending'),
        registrationDate: userToLogin.registrationDate || new Date().toISOString(),
        displayName: userToLogin.displayName || (userToLogin.role === 'admin' ? 'Admin User' : 'Usuario Ejemplo'),
        countryCode: userToLogin.countryCode,
        phoneNumber: userToLogin.phoneNumber,
      };
      
      setCurrentUser(completeUser);
      if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(completeUser));
      
      if (isNewAdminLogin && !allUsers.find(u => u.uid === completeUser.uid)) {
        saveAllUsers([...allUsers, completeUser]);
      } else {
         const userInAllUsersIndex = allUsers.findIndex(u => u.uid === completeUser.uid);
         if (userInAllUsersIndex > -1) {
           const existingUser = allUsers[userInAllUsersIndex];
           if (existingUser.role !== completeUser.role || existingUser.status !== completeUser.status) {
             const updatedAll = allUsers.map(u => u.uid === completeUser.uid ? completeUser : u);
             saveAllUsers(updatedAll);
           }
         } else if (!isNewAdminLogin && !allUsers.find(u => u.uid === completeUser.uid)) { 
            saveAllUsers([...allUsers, completeUser]);
         }
      }

      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', {email: data.email}) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle', {defaultValue: "Login Failed"}), description: t('auth.toast.loginErrorDescription', {defaultValue: "User not found or credentials incorrect."}), variant: 'destructive' });
    }
    setIsLoading(false);
  }, [allUsers, router, t, saveAllUsers, toast]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    if (allUsers.find(u => u.email === userEmailLower)) {
        toast({ title: t('auth.toast.signupErrorTitle', {defaultValue: "Signup Failed"}), description: t('auth.toast.signupErrorEmailExists', {defaultValue: "This email is already registered."}), variant: 'destructive' });
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

    saveAllUsers([...allUsers, newUser]);
    setCurrentUser(newUser);
    if (typeof window !== 'undefined') localStorage.setItem('mockAuthUser', JSON.stringify(newUser));
    setIsLoading(false);
    
    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, {email: data.email}) });
    router.push('/'); 
  }, [allUsers, router, t, saveAllUsers, toast]);

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
            role: googleEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
            status: googleEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'active' : 'pending',
            registrationDate: new Date().toISOString(),
            countryCode: 'US', 
            phoneNumber: '5551234' 
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
            role: appleEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
            status: appleEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'active' : 'pending',
            registrationDate: new Date().toISOString(),
            countryCode: 'US', 
            phoneNumber: '5555678' 
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

  const changePassword = useCallback(async (data: ChangePasswordFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.changePasswordErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    // In a real app, you'd call Firebase Auth or your backend here.
    // For this mock, we'll just simulate success.
    // We don't actually verify currentPassword or store the new one.
    console.log("Simulating password change for user:", currentUser.email);
    console.log("New password (mock):", data.newPassword_profile);
    
    await new Promise(resolve => setTimeout(resolve, 700)); 

    toast({ title: t('auth.toast.changePasswordSuccessTitle'), description: t('auth.toast.changePasswordSuccessDescription') });
    return true;
  }, [currentUser, toast, t]);

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

  const deleteUser = useCallback(async (userIdToDelete: string): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.statusUpdateErrorNotAdmin'), variant: 'destructive' });
      return false;
    }
    if (currentUser.uid === userIdToDelete) {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.deleteErrorSelf'), variant: 'destructive' });
      return false;
    }
    
    const userExists = allUsers.some(user => user.uid === userIdToDelete);
    if (!userExists) {
      toast({ title: t('admin.toast.deleteErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      return false;
    }

    const updatedAllUsers = allUsers.filter(user => user.uid !== userIdToDelete);
    saveAllUsers(updatedAllUsers);
    
    const deletedUser = allUsers.find(u => u.uid === userIdToDelete);
    toast({ title: t('admin.toast.deleteSuccessTitle'), description: t('admin.toast.deleteSuccessDescription', { userName: deletedUser?.displayName || userIdToDelete }) });
    return true;
  }, [currentUser, allUsers, saveAllUsers, toast, t]);

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
