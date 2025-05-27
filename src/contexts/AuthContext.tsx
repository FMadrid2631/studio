
'use client';

import type React from 'react';
import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import type { AuthUser, LoginFormInput, SignupFormInput, EditProfileFormInput, ChangePasswordFormInput } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from './LocalizationContext';
// TODO: Import db from '@/lib/firebase' when implementing Firestore
// import { db } from '@/lib/firebase';
// import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where } from 'firebase/firestore';


const ADMIN_EMAIL = 'fernando.madrid21@hotmail.com';
// const ALL_USERS_STORAGE_KEY = 'rifaFacilApp_allUsers'; // Firestore replaces this
// const CURRENT_USER_STORAGE_KEY = 'mockAuthUser'; // Firestore/Firebase Auth replaces this

const generateInternalCode = () => `USER-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

interface AuthContextType {
  currentUser: AuthUser | null;
  isLoading: boolean; // Represents initial auth state loading
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

  // Effect for loading allUsers from Firestore
  useEffect(() => {
    const loadInitialData = async () => {
      setAuthIsLoading(true);
      // TODO: Implement Firebase Auth onAuthStateChanged listener here
      // This listener would set currentUser based on Firebase's auth state.
      
      // TODO: Fetch all users from Firestore 'users' collection
      // Example:
      // const usersCol = collection(db, 'users');
      // const userSnapshot = await getDocs(usersCol);
      // const loadedUsers = userSnapshot.docs.map(doc => doc.data() as AuthUser);
      // setAllUsers(loadedUsers);

      // For demo purposes, create a mock admin if not found in (empty) loadedUsers
      let loadedUsersFromSource: AuthUser[] = []; // This would be from Firestore
      const adminExists = loadedUsersFromSource.some(u => u.email === ADMIN_EMAIL.toLowerCase());
      if (!adminExists) {
        const mockAdminUser: AuthUser = {
          uid: 'mock-admin-uid-' + ADMIN_EMAIL.toLowerCase(),
          email: ADMIN_EMAIL.toLowerCase(),
          displayName: 'Admin User',
          rut: '11111111-1',
          role: 'admin',
          status: 'active',
          registrationDate: new Date(0).toISOString(),
          countryCode: 'CL',
          phoneNumber: '123456789',
          internalCode: generateInternalCode(),
        };
        loadedUsersFromSource.push(mockAdminUser);
        // TODO: If creating admin for the first time, setDoc in Firestore 'users' collection
      }
      setAllUsers(loadedUsersFromSource);

      // TODO: Set currentUser based on Firebase Auth state. For now, assuming no user is logged in initially.
      setCurrentUser(null); 
      setAuthIsLoading(false);
    };

    loadInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount


  const login = useCallback(async (data: LoginFormInput): Promise<void> => {
    // TODO: Implement Firebase Authentication signInWithEmailAndPassword
    // For now, mock login using the allUsers list (which would be fetched from Firestore)
    
    setAuthIsLoading(true); // Simulate loading during login attempt
    const userEmailLower = data.email.toLowerCase();
    let userInAllUsers = allUsers.find(u => u.email === userEmailLower);

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500)); 

    if (userInAllUsers) {
      setCurrentUser(userInAllUsers);
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else if (userEmailLower === ADMIN_EMAIL.toLowerCase() && !userInAllUsers) {
      // This case should ideally be handled by the initial data load, but as a fallback for demo:
      const adminUser: AuthUser = {
        uid: 'mock-admin-uid-' + userEmailLower,
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
      setAllUsers(prev => [...prev, adminUser]);
      setCurrentUser(adminUser);
      // TODO: Write adminUser to Firestore 'users' collection if it's the first login
      // await setDoc(doc(db, 'users', adminUser.uid), adminUser);
      toast({ title: t('auth.toast.loginSuccessTitle'), description: t('auth.toast.loginSuccessDescription', { email: data.email }) });
      router.push('/');
    } else {
      toast({ title: t('auth.toast.loginErrorTitle'), description: t('auth.toast.loginErrorDescription'), variant: 'destructive' });
    }
    setAuthIsLoading(false);
  }, [allUsers, router, t, toast]);

  const signup = useCallback(async (data: SignupFormInput): Promise<void> => {
    // TODO: Implement Firebase Authentication createUserWithEmailAndPassword
    // TODO: Then, store additional user details (displayName, rut, role, etc.) in Firestore 'users' collection, keyed by UID.
    
    setAuthIsLoading(true);
    const userEmailLower = data.email.toLowerCase();
    const isExisting = allUsers.some(u => u.email === userEmailLower);
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500)); 

    if (isExisting) {
      toast({ title: t('auth.toast.signupErrorTitle'), description: t('auth.toast.signupErrorEmailExists'), variant: 'destructive' });
      setAuthIsLoading(false);
      return;
    }

    const userRole = userEmailLower === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
    const newUserStatus = userRole === 'admin' ? 'active' : 'pending';
    // In a real Firebase Auth scenario, UID would come from Firebase after user creation
    const uid = 'mock-uid-' + userEmailLower + '-' + Math.random().toString(36).substring(2, 7);

    const newUser: AuthUser = {
      uid,
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

    // TODO: Write newUser to Firestore 'users' collection
    // await setDoc(doc(db, 'users', newUser.uid), newUser);

    setAllUsers(prevAllUsers => [...prevAllUsers, newUser]);
    setCurrentUser(newUser); // Mock: log in the user immediately after signup

    const toastDescriptionKey = newUserStatus === 'pending' ? 'auth.toast.signupPendingActivationDescription' : 'auth.toast.signupSuccessDescription';
    toast({ title: t('auth.toast.signupSuccessTitle'), description: t(toastDescriptionKey, { email: data.email }) });
    router.push('/');
    setAuthIsLoading(false);
  }, [allUsers, router, t, toast]);

  const logout = useCallback(async (): Promise<void> => {
    // TODO: Implement Firebase Authentication signOut
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async
    setCurrentUser(null);
    toast({ title: t('auth.toast.logoutSuccessTitle') });
    router.push('/');
    setAuthIsLoading(false);
  }, [router, toast, t]);

  const loginWithGoogle = useCallback(async (): Promise<void> => {
    // TODO: Implement Firebase Authentication signInWithPopup using GoogleAuthProvider
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: t('auth.providerLoginTitle', {provider: "Google"}), description: t('auth.providerLoginDescription', {provider: "Google"}) });
    // Simulate login for demo; in real app, this would create/log in a user in allUsers and Firestore
    // setCurrentUser(someMockGoogleUser);
    // setAllUsers(prev => updatedListWithGoogleUser);
    setAuthIsLoading(false);
  }, [t, toast]);

  const loginWithApple = useCallback(async (): Promise<void> => {
    // TODO: Implement Firebase Authentication signInWithPopup using OAuthProvider('apple.com')
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: t('auth.providerLoginTitle', {provider: "Apple"}), description: t('auth.providerLoginDescription', {provider: "Apple"}) });
    setAuthIsLoading(false);
  }, [t, toast]);

  const updateUserProfile = useCallback(async (data: EditProfileFormInput): Promise<boolean> => {
    if (!currentUser) {
      toast({ title: t('auth.toast.updateProfileErrorTitle'), description: t('auth.toast.updateProfileErrorNotLoggedIn'), variant: 'destructive' });
      return false;
    }
    
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedUser = {
      ...currentUser,
      displayName: data.displayName,
      rut: data.rut,
    };

    // TODO: Update user document in Firestore 'users' collection
    // await updateDoc(doc(db, 'users', currentUser.uid), { displayName: data.displayName, rut: data.rut });

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
    // TODO: Implement Firebase Authentication updatePassword. This is a sensitive operation.
    // Firebase Auth handles current password verification.
    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 700));
    setAuthIsLoading(false);
    toast({ title: t('auth.toast.changePasswordSuccessTitle'), description: t('auth.toast.changePasswordSuccessDescription') });
    return true;
  }, [currentUser, t, toast]);

  const updateUserStatus = useCallback(async (userId: string, newStatus: AuthUser['status']): Promise<boolean> => {
    if (currentUser?.role !== 'admin') {
      toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorNotAdmin'), variant: 'destructive' });
      return false;
    }
    
    const targetUserForUpdate = allUsers.find(u => u.uid === userId);
    if (targetUserForUpdate && currentUser.uid === userId && targetUserForUpdate.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() && newStatus !== 'active') {
      toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: "Administrators cannot change their own status to non-active.", variant: 'destructive' });
      return false;
    }
    
    setAuthIsLoading(true); // Potentially indicate loading state while updating
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async

    let userWasUpdated = false;
    let updatedUserName = userId;

    setAllUsers(prevAllUsers =>
      prevAllUsers.map(user => {
        if (user.uid === userId && user.status !== newStatus) {
          userWasUpdated = true;
          updatedUserName = user.displayName || userId;
          // If admin updates their own status (and they are not the main ADMIN_EMAIL or status remains 'active')
          if (currentUser.uid === userId) {
             setCurrentUser(prev => prev ? { ...prev, status: newStatus } : null);
          }
          return { ...user, status: newStatus };
        }
        return user;
      })
    );
    setAuthIsLoading(false);

    if (userWasUpdated) {
      toast({ title: t('admin.toast.statusUpdateSuccessTitle'), description: t('admin.toast.statusUpdateSuccessDescription', { userName: updatedUserName, newStatus: t(`admin.userStatus.${newStatus}`) }) });
      return true;
    } else {
      // This can happen if the user's status was already the newStatus, or user not found (though find was done earlier)
      // toast({ title: t('admin.toast.statusUpdateErrorTitle'), description: t('admin.toast.statusUpdateErrorUserNotFound'), variant: 'destructive' });
      return false; // Or true if no change needed is not an error
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

    setAuthIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // Simulate async

    // TODO: Delete user from Firestore 'users' collection
    // await deleteDoc(doc(db, 'users', userIdToDelete));
    // TODO: Optionally, delete user from Firebase Authentication itself (requires Admin SDK or careful handling)

    setAllUsers(prevAllUsers => prevAllUsers.filter(user => user.uid !== userIdToDelete));
    setAuthIsLoading(false);
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

