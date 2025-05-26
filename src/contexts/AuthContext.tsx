
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
  const [authIsLoading, setAuthIsLoading] = useState(true); // Renamed from isLoading to avoid conflict
  const [allUsers, setAllUsers] = useState<AuthUser[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Load allUsers from localStorage on initial mount
  useEffect(() => {
    setAuthIsLoading(true);
    let loadedUsers: AuthUser[] = [];
    if (typeof window !== 'undefined') {
      const storedAllUsersJson = localStorage.getItem(ALL_USERS_STORAGE_KEY);
      if (storedAllUsersJson) {
        try {
          const parsedStoredUsers = JSON.parse(storedAllUsersJson) as Partial<AuthUser>[];
          loadedUsers = parsedStoredUsers.map(user => {
            const isActualAdminByEmail = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
            return {
              uid: user.uid || `mock-uid-${user.email || Math.random()}-${Date.now()}`,
              email: user.email || 'unknown@example.com',
              displayName: user.displayName || (isActualAdminByEmail ? 'Admin User' : ''),
              rut: user.rut,
              role: user.role || (isActualAdminByEmail ? 'admin' : 'user'),
              status: user.status || (isActualAdminByEmail ? 'active' : 'pending'),
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
    // setAuthIsLoading(false); // Defer this until currentUser is also attempted
  }, []);

  // Load currentUser from localStorage and reconcile with allUsers
  useEffect(() => {
    // This effect runs after allUsers might have been populated from its own localStorage load
    // and also if allUsers array changes.
    if (authIsLoading && allUsers.length === 0 && localStorage.getItem(ALL_USERS_STORAGE_KEY)) {
      // If allUsers is still empty but there was something in storage,
      // it means the allUsers effect might not have completed its first run.
      // We wait for allUsers to potentially populate.
      // This condition is a bit complex, ideally, initial loading is handled more centrally.
      // For now, let's proceed but be mindful.
    }

    let userToSet: AuthUser | null = null;
    if (typeof window !== 'undefined') {
      const storedUserJson = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
      if (storedUserJson) {
        try {
          const parsedUser = JSON.parse(storedUserJson) as Partial<AuthUser>;
          if (parsedUser.uid && parsedUser.email) {
            // Attempt to find the most complete version from allUsers
            const userFromAllUsersList = allUsers.find(u => u.uid === parsedUser.uid);
            if (userFromAllUsersList) {
              userToSet = userFromAllUsersList; // Use the version from allUsers for consistency
            } else {
              // Fallback to constructing from parsedUser if not in allUsers (should be rare for a logged-in user)
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
             // Ensure admin role is correctly set if email matches, overriding stored role if necessary
             if (userToSet && userToSet.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && userToSet.role !== 'admin') {
              userToSet.role = 'admin';
              userToSet.status = 'active'; // Admins are active by default
            }
          }
        } catch (e) {
          console.error("Error processing stored currentUser:", e);
        }
      }
    }
    setCurrentUser(userToSet);
    setAuthIsLoading(false); // Auth loading is complete after both allUsers and currentUser attempts
  }, [allUsers]); // Depend on allUsers to re-evaluate currentUser if allUsers changes

  // Persist allUsers to localStorage
  useEffect(() => {
    if (!authIsLoading && typeof window !== 'undefined') {
      localStorage.setItem(ALL_USERS_STORAGE_KEY, JSON.stringify(allUsers));
    }
  }, [allUsers, authIsLoading]);

  // Persist currentUser to localStorage
  useEffect(() => {
    if (!authIsLoading && typeof window !== 'undefined') {
      if (currentUser) {
        localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      }
    }
  }, [currentUser, authIsLoading]);


  const login = useCallback(async (data: LoginFormInput) => {
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const userEmailLower = data.email.toLowerCase();
    let userToLogin = allUsers.find(u => u.email === userEmailLower);
    
    if (userToLogin) {
      // Ensure the user object from allUsers is complete
      const isActualAdminByEmail = userToLogin.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      const completeUser: AuthUser = {
        ...userToLogin,
        role: userToLogin.role || (isActualAdminByEmail ? 'admin' : 'user'),
        status: userToLogin.status || (isActualAdminByEmail ? 'active' : 'pending'),
        registrationDate: userToLogin.registrationDate || new Date(0).toISOString(),
        internalCode: userToLogin.internalCode || generateInternalCode(),
        // displayName, rut, countryCode, phoneNumber should be there if user came from signup
      };
      setCurrentUser(completeUser);
      // If the version in allUsers was less complete, update it (though primary load should handle this)
      setAllUsers(prev => prev.map(u => u.uid === completeUser.uid ? completeUser : u));
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else if (userEmailLower === ADMIN_EMAIL.toLowerCase()) {
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
      setAllUsers(prev => {
          const existingAdminIndex = prev.findIndex(u => u.email === adminUser.email);
          if (existingAdminIndex !== -1) {
              const updated = [...prev];
              updated[existingAdminIndex] = adminUser; // Replace if admin "logs in" first time
              return updated;
          }
          return [...prev, adminUser];
      });
      setCurrentUser(adminUser);
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle'), description: t('auth.toast.loginErrorDescription'), variant: 'destructive' });
    }
    setAuthIsLoading(false);
  }, [allUsers, router, t, toast]);

  const signup = useCallback(async (data: SignupFormInput) => {
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

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
            // If user with this email exists, replace their data entirely with new signup data
            const updatedUsers = [...prevAllUsers];
            updatedUsers[existingUserIndex] = newUser; 
            return updatedUsers;
        }
        // If user (by email) doesn't exist, add them.
        // Also handle case where UID might collide if not truly unique, though less likely with mock UIDs.
        const existingUserByUIDIndex = prevAllUsers.findIndex(u => u.uid === newUser.uid);
        if (existingUserByUIDIndex !== -1) {
            const updatedUsers = [...prevAllUsers];
            updatedUsers[existingUserByUIDIndex] = newUser;
            return updatedUsers;
        }
        return [...prevAllUsers, newUser];
    });

    setCurrentUser(newUser);
    setAuthIsLoading(false);

    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, { email: data.email }) });
    router.push('/');
  }, [router, t, toast]);

  const logout = useCallback(async () => {
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setCurrentUser(null);
    setAuthIsLoading(false);
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
    setAuthIsLoading(true); // Consider if this global loading is too disruptive for profile updates
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

    setAuthIsLoading(false);
    toast({ title: t('auth.toast.updateProfileSuccessTitle'), description: t('auth.toast.updateProfileSuccessDescription') });
    return true;
  }, [currentUser, t, toast]);

  const changePassword = useCallback(async (data: ChangePasswordFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.changePasswordErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    // console.log("Simulating password change for user:", currentUser.email);
    // console.log("New password (mock):", data.newPassword_profile);
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
          userWasUpdated = true;
          updatedUserName = user.displayName || userId;
          // If admin is updating their own status via this admin tool (shouldn't happen via UI but defensive)
          if (currentUser.uid === userId && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newStatus !== 'active') {
             // Prevent admin from deactivating themselves
             toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: "Administrators cannot change their own status to non-active.", variant: 'destructive' });
             userWasUpdated = false; // Revert update flag
             return user; // Return original user
          }
          return { ...user, status: newStatus };
        }
        return user;
      })
    );

    if (userWasUpdated) {
      // If the admin updated the status of the currently logged-in user (and it wasn't the admin themselves)
      if (currentUser.uid === userId && currentUser.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) { 
        setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
      }
      toast({ title: t('admin.toast.statusUpdateSuccessTitle'), description: t('admin.toast.statusUpdateSuccessDescription', { userName: updatedUserName, newStatus: t(`admin.userStatus.${newStatus}`) }) });
      return true;
    } else {
      const targetUserExists = allUsers.some(u => u.uid === userId);
      if (!targetUserExists) {
        toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      }
      // If userWasUpdated is false but targetUserExists, it might be because admin tried to deactivate self.
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

    