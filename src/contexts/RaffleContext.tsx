
'use client';

import type { Raffle, Prize, RaffleNumber, RaffleConfigurationFormInput, BankDetails } from '@/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { COUNTRIES } from '@/lib/countries';
import { useAuth } from './AuthContext';
// TODO: Import db from '@/lib/firebase' when implementing Firestore
// import { db } from '@/lib/firebase';
// import { collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';


interface RaffleContextType {
  raffles: Raffle[];
  isLoading: boolean;
  addRaffle: (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    prizes: { description: string; referenceValue?: number }[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }) => Promise<Raffle | undefined>;
  getRaffleById: (id: string) => Raffle | undefined; // Remains sync for local cache access
  updateRaffle: (updatedRaffle: Raffle) => Promise<void>; // Becomes async
  editRaffle: (raffleId: string, updatedData: RaffleConfigurationFormInput) => Promise<Raffle | undefined>;
  purchaseNumbers: (raffleId: string, buyerName: string, buyerPhone: string, selectedNumbers: number[], paymentMethod: 'Cash' | 'Transfer' | 'Pending') => Promise<boolean>;
  recordPrizeWinner: (
    raffleId: string,
    prizeOrder: number,
    winningNumber: number,
    winnerName: string,
    winnerPhone: string,
    winnerPaymentMethod?: 'Cash' | 'Transfer' | 'Pending'
  ) => Promise<void>;
  closeRaffle: (raffleId: string) => Promise<void>;
  updatePendingPayment: (raffleId: string, numberId: number, newPaymentMethod: 'Cash' | 'Transfer') => Promise<boolean>;
  deleteRaffle: (raffleId: string) => Promise<boolean>;
  updateBuyerDetails: (raffleId: string, numberId: number, newBuyerName: string, newBuyerPhone: string) => Promise<boolean>;
  cancelNumberPurchase: (raffleId: string, numberIdToCancel: number) => Promise<boolean>;
}

const RaffleContext = createContext<RaffleContextType | undefined>(undefined);

export const RaffleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, isLoading: authIsLoading } = useAuth();

  // Load raffles for the current user from Firestore when currentUser changes
  useEffect(() => {
    const fetchRaffles = async () => {
      if (authIsLoading) {
        setIsLoading(true);
        setRaffles([]);
        return;
      }
      if (!currentUser) {
        setRaffles([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      // TODO: Fetch raffles from Firestore for currentUser.uid
      // Example:
      // const rafflesCol = collection(db, `users/${currentUser.uid}/raffles`);
      // const raffleSnapshot = await getDocs(rafflesCol);
      // let loadedRaffles = raffleSnapshot.docs.map(doc => doc.data() as Raffle);
      
      // For demo, initialize with empty array, or apply status checks if data was somehow loaded
      let loadedRaffles: Raffle[] = []; // Replace with actual Firestore fetch

      // Perform status checks (can be done after fetching from Firestore)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const checkedRaffles = loadedRaffles.map(raffle => {
        let currentRaffle = { ...raffle };
        if (currentRaffle.status === 'Open') {
          const allPrizesAwarded = currentRaffle.prizes?.every(p => !!p.winningNumber);
          const drawDate = new Date(currentRaffle.drawDate);
          drawDate.setHours(0,0,0,0);
          if (allPrizesAwarded || drawDate < today) {
            currentRaffle.status = 'Closed';
            // TODO: If status changed, update this raffle doc in Firestore
          }
        }
        // Ensure winnerPaymentMethod is populated for older raffles
        if (currentRaffle.prizes) {
            currentRaffle.prizes = currentRaffle.prizes.map(p => {
                if (p.winningNumber && !p.winnerPaymentMethod) {
                    const winningRaffleNumber = currentRaffle.numbers.find(rn => rn.id === p.winningNumber && rn.status === 'Purchased');
                    if (winningRaffleNumber && winningRaffleNumber.paymentMethod) {
                        return { ...p, winnerPaymentMethod: winningRaffleNumber.paymentMethod };
                    }
                }
                return p;
            });
        }
        return currentRaffle;
      });

      setRaffles(checkedRaffles);
      setIsLoading(false);
    };

    fetchRaffles();
  }, [currentUser, authIsLoading]);


  const addRaffle = async (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    prizes: { description: string; referenceValue?: number }[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }): Promise<Raffle | undefined> => {
    if (!currentUser || currentUser.status !== 'active') {
      console.warn("User must be logged in and active to create a raffle.");
      return undefined;
    }
    const country = COUNTRIES.find(c => c.code === raffleData.countryCode);
    if (!country) {
      throw new Error("Invalid country code provided for new raffle.");
    }

    const bankDetails: BankDetails | undefined = (
        raffleData.bankName || raffleData.accountHolderName || raffleData.accountNumber ||
        raffleData.accountType || raffleData.identificationNumber || raffleData.transferInstructions
    ) ? { /* ...bank details assignment... */ } : undefined;

    const newRaffleId = crypto.randomUUID(); // Or use Firestore's auto-ID
    const newRaffle: Raffle = {
      name: raffleData.name,
      country: country,
      totalNumbers: raffleData.totalNumbers,
      numberValue: raffleData.numberValue,
      drawDate: raffleData.drawDate.toISOString(),
      id: newRaffleId,
      createdAt: new Date().toISOString(),
      status: 'Open',
      numbers: Array.from({ length: raffleData.totalNumbers }, (_, i) => ({ id: i + 1, status: 'Available' })),
      prizes: raffleData.prizes.map((p, index) => ({
        id: crypto.randomUUID(),
        description: p.description,
        order: index + 1,
        referenceValue: p.referenceValue === undefined || p.referenceValue === null || isNaN(Number(p.referenceValue)) ? 0 : Number(p.referenceValue),
        drawDate: undefined,
        winnerPaymentMethod: undefined,
      })),
      bankDetails: bankDetails,
    };

    // TODO: Add newRaffle to Firestore under `users/${currentUser.uid}/raffles/${newRaffle.id}`
    // await setDoc(doc(db, `users/${currentUser.uid}/raffles`, newRaffle.id), newRaffle);

    setRaffles(prevRaffles => [...prevRaffles, newRaffle]);
    return newRaffle;
  };

  const getRaffleById = (id: string): Raffle | undefined => {
    return raffles.find(raffle => raffle.id === id);
  };

  const updateRaffleInStateAndFirestore = async (updatedRaffle: Raffle) => {
    if (!currentUser) return;
    // TODO: Update the raffle document in Firestore `users/${currentUser.uid}/raffles/${updatedRaffle.id}`
    // await setDoc(doc(db, `users/${currentUser.uid}/raffles`, updatedRaffle.id), updatedRaffle);
    setRaffles(prevRaffles => prevRaffles.map(r => r.id === updatedRaffle.id ? updatedRaffle : r));
  };
  
  const editRaffle = async (raffleId: string, updatedData: RaffleConfigurationFormInput): Promise<Raffle | undefined> => {
    if (!currentUser) return undefined;
    const existingRaffle = getRaffleById(raffleId);
    if (!existingRaffle) return undefined;

    const country = COUNTRIES.find(c => c.code === updatedData.countryCode) || existingRaffle.country;
    const bankDetails: BankDetails | undefined = (
        updatedData.bankName || updatedData.accountHolderName || updatedData.accountNumber ||
        updatedData.accountType || updatedData.identificationNumber || updatedData.transferInstructions
    ) ? { /* ...bank details assignment... */ } : undefined;

    const editedRaffle: Raffle = {
      ...existingRaffle,
      name: updatedData.name,
      country: country,
      totalNumbers: existingRaffle.totalNumbers,
      numberValue: updatedData.numberValue,
      drawDate: updatedData.drawDate.toISOString(),
      prizes: updatedData.prizes.map((p, index) => ({
        id: existingRaffle.prizes[index]?.id || crypto.randomUUID(),
        description: p.description, order: index + 1,
        referenceValue: p.referenceValue ?? 0,
        winningNumber: existingRaffle.prizes[index]?.winningNumber,
        winnerName: existingRaffle.prizes[index]?.winnerName,
        winnerPhone: existingRaffle.prizes[index]?.winnerPhone,
        drawDate: existingRaffle.prizes[index]?.drawDate,
        winnerPaymentMethod: existingRaffle.prizes[index]?.winnerPaymentMethod,
      })),
      numbers: existingRaffle.numbers,
      bankDetails: bankDetails,
    };
    await updateRaffleInStateAndFirestore(editedRaffle);
    return editedRaffle;
  };

  const purchaseNumbers = async (raffleId: string, buyerName: string, buyerPhone: string, selectedNumbers: number[], paymentMethod: 'Cash' | 'Transfer' | 'Pending'): Promise<boolean> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed' || !currentUser) return false;

    // It's safer to fetch the latest raffle state from Firestore before updating numbers
    // For now, we operate on local state.
    const updatedNumbers = raffle.numbers.map(num => {
      if (selectedNumbers.includes(num.id) && num.status === 'Available') {
        return { ...num, status: paymentMethod === 'Pending' ? 'PendingPayment' : 'Purchased', buyerName, buyerPhone, paymentMethod, purchaseDate: new Date().toISOString() };
      }
      return num;
    });
    // Check if all selected numbers were indeed available before this local update
    const success = selectedNumbers.every(sn => raffle.numbers.find(n => n.id === sn)?.status === 'Available');

    if(success) {
      await updateRaffleInStateAndFirestore({ ...raffle, numbers: updatedNumbers });
    }
    return success;
  };

  const recordPrizeWinner = async (raffleId: string, prizeOrder: number, winningNumber: number, winnerName: string, winnerPhone: string, winnerPaymentMethod?: 'Cash' | 'Transfer' | 'Pending'): Promise<void> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || !currentUser) return;
    const updatedPrizes = raffle.prizes.map(prize => {
      if (prize.order === prizeOrder) {
        return { ...prize, winningNumber, winnerName, winnerPhone, drawDate: new Date().toISOString(), winnerPaymentMethod };
      }
      return prize;
    });
    await updateRaffleInStateAndFirestore({ ...raffle, prizes: updatedPrizes });
  };

  const closeRaffle = async (raffleId: string): Promise<void> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || !currentUser) return;
    await updateRaffleInStateAndFirestore({ ...raffle, status: 'Closed' });
  };

  const updatePendingPayment = async (raffleId: string, numberId: number, newPaymentMethod: 'Cash' | 'Transfer'): Promise<boolean> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed' || !currentUser) return false;
    let numberUpdated = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberId && num.status === 'PendingPayment') {
        numberUpdated = true;
        return { ...num, status: 'Purchased', paymentMethod: newPaymentMethod, purchaseDate: new Date().toISOString() };
      }
      return num;
    });
    if (numberUpdated) {
      await updateRaffleInStateAndFirestore({ ...raffle, numbers: updatedNumbers });
      return true;
    }
    return false;
  };
  
  const deleteRaffle = async (raffleId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const raffleToDelete = getRaffleById(raffleId);
    if (!raffleToDelete) return false;
    const hasSoldOrPendingNumbers = raffleToDelete.numbers.some(n => n.status !== 'Available');
    if (raffleToDelete.status === 'Open' && hasSoldOrPendingNumbers) return false;

    // TODO: Delete raffle document from Firestore `users/${currentUser.uid}/raffles/${raffleId}`
    // await deleteDoc(doc(db, `users/${currentUser.uid}/raffles`, raffleId));
    setRaffles(prevRaffles => prevRaffles.filter(r => r.id !== raffleId));
    return true;
  };

  const updateBuyerDetails = async (raffleId: string, numberId: number, newBuyerName: string, newBuyerPhone: string): Promise<boolean> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed' || !currentUser) return false;
    let buyerUpdated = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberId && num.status === 'Purchased') {
        buyerUpdated = true;
        return { ...num, buyerName: newBuyerName, buyerPhone: newBuyerPhone };
      }
      return num;
    });
    if (buyerUpdated) {
      await updateRaffleInStateAndFirestore({ ...raffle, numbers: updatedNumbers });
      return true;
    }
    return false;
  };

  const cancelNumberPurchase = async (raffleId: string, numberIdToCancel: number): Promise<boolean> => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed' || !currentUser) return false;
    let numberCancelled = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberIdToCancel && (num.status === 'Purchased' || num.status === 'PendingPayment')) {
        numberCancelled = true;
        return { id: num.id, status: 'Available', buyerName: undefined, buyerPhone: undefined, paymentMethod: undefined, purchaseDate: undefined };
      }
      return num;
    });

    if (numberCancelled) {
      let prizesUpdated = false;
      const updatedPrizes = raffle.prizes.map(prize => {
        if (prize.winningNumber === numberIdToCancel) {
          prizesUpdated = true;
          return { ...prize, winningNumber: undefined, winnerName: undefined, winnerPhone: undefined, drawDate: undefined, winnerPaymentMethod: undefined };
        }
        return prize;
      });
      await updateRaffleInStateAndFirestore({ ...raffle, numbers: updatedNumbers, prizes: prizesUpdated ? updatedPrizes : raffle.prizes });
      return true;
    }
    return false;
  };

  return (
    <RaffleContext.Provider value={{
        raffles, isLoading, addRaffle, getRaffleById,
        updateRaffle: updateRaffleInStateAndFirestore, // Use the async wrapper
        editRaffle, purchaseNumbers, recordPrizeWinner, closeRaffle,
        updatePendingPayment, deleteRaffle, updateBuyerDetails, cancelNumberPurchase
    }}>
      {children}
    </RaffleContext.Provider>
  );
};

export const useRaffles = (): RaffleContextType => {
  const context = useContext(RaffleContext);
  if (context === undefined) {
    throw new Error('useRaffles must be used within a RaffleProvider');
  }
  return context;
};
