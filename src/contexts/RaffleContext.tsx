
'use client';

import type { Raffle, Prize, RaffleNumber, RaffleConfigurationFormInput, BankDetails } from '@/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { COUNTRIES } from '@/lib/countries'; // Import COUNTRIES
import { useAuth } from './AuthContext'; // Import useAuth to get current user

interface RaffleContextType {
  raffles: Raffle[];
  isLoading: boolean; // This will be true if auth is loading OR user-specific raffles are loading
  addRaffle: (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    prizes: { description: string; referenceValue?: number }[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }) => Raffle | undefined; // Return undefined if not logged in
  getRaffleById: (id: string) => Raffle | undefined;
  updateRaffle: (updatedRaffle: Raffle) => void;
  editRaffle: (raffleId: string, updatedData: RaffleConfigurationFormInput) => Raffle | undefined;
  purchaseNumbers: (raffleId: string, buyerName: string, buyerPhone: string, selectedNumbers: number[], paymentMethod: 'Cash' | 'Transfer' | 'Pending') => boolean;
  recordPrizeWinner: (
    raffleId: string, 
    prizeOrder: number, 
    winningNumber: number, 
    winnerName: string, 
    winnerPhone: string,
    winnerPaymentMethod?: 'Cash' | 'Transfer' | 'Pending'
  ) => void;
  closeRaffle: (raffleId: string) => void;
  updatePendingPayment: (raffleId: string, numberId: number, newPaymentMethod: 'Cash' | 'Transfer') => boolean;
  deleteRaffle: (raffleId: string) => boolean;
  updateBuyerDetails: (raffleId: string, numberId: number, newBuyerName: string, newBuyerPhone: string) => boolean;
  cancelNumberPurchase: (raffleId: string, numberIdToCancel: number) => boolean;
}

const RaffleContext = createContext<RaffleContextType | undefined>(undefined);

export const RaffleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, isLoading: authIsLoading } = useAuth();

  const getRafflesKey = useCallback(() => {
    if (authIsLoading) return 'PENDING_AUTH_RAFFLE_KEY'; // Indicates auth is still resolving
    if (!currentUser) return null; // No user, no specific key (means no raffles to load/save for non-user)
    return `rifaFacilApp_raffles_${currentUser.uid}`;
  }, [currentUser, authIsLoading]);

  const saveRaffles = useCallback((updatedRaffles: Raffle[]) => {
    const storageKey = getRafflesKey();
    // Only save to localStorage if there's a valid user-specific key
    if (storageKey && storageKey !== 'PENDING_AUTH_RAFFLE_KEY') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedRaffles));
      } catch (error) {
        console.error("Failed to save raffles to localStorage for key:", storageKey, error);
      }
    }
    setRaffles(updatedRaffles); // Always update in-memory state
  }, [getRafflesKey]);

  useEffect(() => {
    if (authIsLoading) {
      setIsLoading(true); // Indicate that raffle data is pending auth resolution
      setRaffles([]);     // Clear raffles while auth status is unknown
      return;
    }

    const storageKey = getRafflesKey();
    let initialRaffles: Raffle[] = [];

    if (storageKey && storageKey !== 'PENDING_AUTH_RAFFLE_KEY') { // We have a user, try to load their raffles
      try {
        const storedRaffles = localStorage.getItem(storageKey);
        if (storedRaffles) {
          initialRaffles = JSON.parse(storedRaffles) as Raffle[];
        }
      } catch (error) {
        console.error("Failed to load raffles from localStorage for key:", storageKey, error);
        initialRaffles = []; // Fallback to empty on error
      }
    } else { // No currentUser, so no raffles to load for them
      initialRaffles = [];
    }

    let madeChanges = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 

    const checkedRaffles = initialRaffles.map(raffle => {
      let currentRaffle = { ...raffle };
      let statusChanged = false;

      if (currentRaffle.status === 'Open') {
        const allPrizesAwarded = currentRaffle.prizes && currentRaffle.prizes.length > 0 && currentRaffle.prizes.every(p => !!p.winningNumber);
        const drawDate = new Date(currentRaffle.drawDate);
        drawDate.setHours(0,0,0,0);

        if (allPrizesAwarded || drawDate < today) {
          currentRaffle.status = 'Closed';
          statusChanged = true;
        }
      }
      
      if (statusChanged) {
        madeChanges = true;
      }

      if (currentRaffle.prizes) {
        const prizesUpdated = currentRaffle.prizes.map(p => {
          if (p.winningNumber && !p.winnerPaymentMethod) {
            const winningRaffleNumber = currentRaffle.numbers.find(rn => rn.id === p.winningNumber && rn.status === 'Purchased');
            if (winningRaffleNumber && winningRaffleNumber.paymentMethod) {
              // madeChanges = true; // This was causing an infinite loop with saveRaffles in dep array
              return { ...p, winnerPaymentMethod: winningRaffleNumber.paymentMethod };
            }
          }
          return p;
        });
         // Check if prizes actually changed to avoid unnecessary save
        if (!currentRaffle.prizes.every((p, i) => JSON.stringify(p) === JSON.stringify(prizesUpdated[i]))) {
            madeChanges = true;
            currentRaffle.prizes = prizesUpdated;
        }
      }
      return currentRaffle;
    });

    if (madeChanges) {
      saveRaffles(checkedRaffles); // saveRaffles will use the correct key and update state
    } else {
      setRaffles(initialRaffles); // Set the loaded (or empty) raffles
    }
    setIsLoading(false); // Raffle loading is complete
  }, [getRafflesKey, authIsLoading, saveRaffles]);


  const addRaffle = (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    prizes: { description: string; referenceValue?: number }[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }): Raffle | undefined => {
    if (!currentUser || authIsLoading) {
      console.warn("User must be logged in to create a raffle.");
      // Optionally, you could show a toast message here.
      return undefined;
    }
    const country = COUNTRIES.find(c => c.code === raffleData.countryCode);
    if (!country) {
      throw new Error("Invalid country code provided for new raffle.");
    }

    const bankDetails: BankDetails | undefined = (
        raffleData.bankName ||
        raffleData.accountHolderName ||
        raffleData.accountNumber ||
        raffleData.accountType ||
        raffleData.identificationNumber ||
        raffleData.transferInstructions
    ) ? {
        bankName: raffleData.bankName,
        accountHolderName: raffleData.accountHolderName,
        accountNumber: raffleData.accountNumber,
        accountType: raffleData.accountType,
        identificationNumber: raffleData.identificationNumber,
        transferInstructions: raffleData.transferInstructions,
    } : undefined;


    const newRaffle: Raffle = {
      name: raffleData.name,
      country: country,
      totalNumbers: raffleData.totalNumbers,
      numberValue: raffleData.numberValue,
      drawDate: raffleData.drawDate.toISOString(),
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Open',
      numbers: Array.from({ length: raffleData.totalNumbers }, (_, i) => ({
        id: i + 1,
        status: 'Available',
      })),
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
    const updatedRaffles = [...raffles, newRaffle];
    saveRaffles(updatedRaffles);
    return newRaffle;
  };

  const getRaffleById = (id: string): Raffle | undefined => {
    // This will search within the currently loaded (user-specific) raffles
    return raffles.find(raffle => raffle.id === id);
  };

  const updateRaffle = (updatedRaffle: Raffle) => {
    const updatedRaffles = raffles.map(r => r.id === updatedRaffle.id ? updatedRaffle : r);
    saveRaffles(updatedRaffles);
  };

  const editRaffle = (raffleId: string, updatedData: RaffleConfigurationFormInput): Raffle | undefined => {
    if (!currentUser || authIsLoading) {
      console.warn("User must be logged in to edit a raffle.");
      return undefined;
    }
    const existingRaffle = getRaffleById(raffleId);
    if (!existingRaffle) return undefined;

    const country = COUNTRIES.find(c => c.code === updatedData.countryCode) || existingRaffle.country;
    const bankDetails: BankDetails | undefined = (
        updatedData.bankName ||
        updatedData.accountHolderName ||
        updatedData.accountNumber ||
        updatedData.accountType ||
        updatedData.identificationNumber ||
        updatedData.transferInstructions
    ) ? {
        bankName: updatedData.bankName,
        accountHolderName: updatedData.accountHolderName,
        accountNumber: updatedData.accountNumber,
        accountType: updatedData.accountType,
        identificationNumber: updatedData.identificationNumber,
        transferInstructions: updatedData.transferInstructions,
    } : undefined;

    const editedRaffle: Raffle = {
      ...existingRaffle,
      name: updatedData.name,
      country: country,
      totalNumbers: existingRaffle.totalNumbers,
      numberValue: updatedData.numberValue,
      drawDate: updatedData.drawDate.toISOString(),
      prizes: updatedData.prizes.map((p, index) => ({
        id: existingRaffle.prizes[index]?.id || crypto.randomUUID(),
        description: p.description,
        order: index + 1,
        referenceValue: p.referenceValue === undefined || p.referenceValue === null || isNaN(Number(p.referenceValue)) ? 0 : Number(p.referenceValue),
        winningNumber: existingRaffle.prizes[index]?.winningNumber,
        winnerName: existingRaffle.prizes[index]?.winnerName,
        winnerPhone: existingRaffle.prizes[index]?.winnerPhone,
        drawDate: existingRaffle.prizes[index]?.drawDate,
        winnerPaymentMethod: existingRaffle.prizes[index]?.winnerPaymentMethod,
      })),
      numbers: existingRaffle.numbers, 
      bankDetails: bankDetails,
    };

    const updatedRaffles = raffles.map(r => (r.id === raffleId ? editedRaffle : r));
    saveRaffles(updatedRaffles);
    return editedRaffle;
  };

  const purchaseNumbers = (raffleId: string, buyerName: string, buyerPhone: string, selectedNumbers: number[], paymentMethod: 'Cash' | 'Transfer' | 'Pending'): boolean => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed') return false;

    const updatedNumbers = raffle.numbers.map(num => {
      if (selectedNumbers.includes(num.id) && num.status === 'Available') {
        return {
          ...num,
          status: paymentMethod === 'Pending' ? 'PendingPayment' : 'Purchased',
          buyerName,
          buyerPhone,
          paymentMethod,
          purchaseDate: new Date().toISOString(),
        };
      }
      return num;
    });

    const success = selectedNumbers.every(sn => {
        const originalNum = raffle.numbers.find(n => n.id === sn);
        return originalNum && originalNum.status === 'Available';
    });

    if(success) {
        updateRaffle({ ...raffle, numbers: updatedNumbers });
    }
    return success;
  };

  const recordPrizeWinner = (
    raffleId: string, 
    prizeOrder: number, 
    winningNumber: number, 
    winnerName: string, 
    winnerPhone: string,
    winnerPaymentMethod?: 'Cash' | 'Transfer' | 'Pending'
  ) => {
    const raffle = getRaffleById(raffleId);
    if (!raffle) return;

    const updatedPrizes = raffle.prizes.map(prize => {
      if (prize.order === prizeOrder) {
        return { ...prize, winningNumber, winnerName, winnerPhone, drawDate: new Date().toISOString(), winnerPaymentMethod };
      }
      return prize;
    });
    updateRaffle({ ...raffle, prizes: updatedPrizes });
  };

  const closeRaffle = (raffleId: string) => {
    const raffle = getRaffleById(raffleId);
    if (!raffle) return;
    updateRaffle({ ...raffle, status: 'Closed' });
  };

  const updatePendingPayment = (raffleId: string, numberId: number, newPaymentMethod: 'Cash' | 'Transfer'): boolean => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed') return false;

    let numberUpdated = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberId && num.status === 'PendingPayment') {
        numberUpdated = true;
        return {
          ...num,
          status: 'Purchased',
          paymentMethod: newPaymentMethod,
          purchaseDate: new Date().toISOString(), 
        };
      }
      return num;
    });

    if (numberUpdated) {
      updateRaffle({ ...raffle, numbers: updatedNumbers });
      return true;
    }
    return false;
  };

  const deleteRaffle = (raffleId: string): boolean => {
     if (!currentUser || authIsLoading) {
      console.warn("User must be logged in to delete a raffle.");
      return false;
    }
    const raffleToDelete = getRaffleById(raffleId);
    if (!raffleToDelete) {
      console.warn(`Raffle with id ${raffleId} not found for deletion.`);
      return false;
    }

    const hasSoldOrPendingNumbers = raffleToDelete.numbers.some(n => n.status !== 'Available');

    if (raffleToDelete.status === 'Open' && hasSoldOrPendingNumbers) {
      console.warn(`Cannot delete OPEN raffle ${raffleId}: it has sold or pending numbers.`);
      return false;
    }

    const updatedRaffles = raffles.filter(r => r.id !== raffleId);
    saveRaffles(updatedRaffles);
    return true;
  };

  const updateBuyerDetails = (raffleId: string, numberId: number, newBuyerName: string, newBuyerPhone: string): boolean => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed') return false;

    let buyerUpdated = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberId && num.status === 'Purchased') {
        buyerUpdated = true;
        return {
          ...num,
          buyerName: newBuyerName,
          buyerPhone: newBuyerPhone,
        };
      }
      return num;
    });

    if (buyerUpdated) {
      updateRaffle({ ...raffle, numbers: updatedNumbers });
      return true;
    }
    return false;
  };

  const cancelNumberPurchase = (raffleId: string, numberIdToCancel: number): boolean => {
    const raffle = getRaffleById(raffleId);
    if (!raffle || raffle.status === 'Closed') return false;

    let numberCancelled = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberIdToCancel && (num.status === 'Purchased' || num.status === 'PendingPayment')) {
        numberCancelled = true;
        return {
          id: num.id, 
          status: 'Available', 
          buyerName: undefined,
          buyerPhone: undefined,
          paymentMethod: undefined,
          purchaseDate: undefined,
        };
      }
      return num;
    });

    if (numberCancelled) {
      let prizesUpdated = false;
      const updatedPrizes = raffle.prizes.map(prize => {
        if (prize.winningNumber === numberIdToCancel) {
          prizesUpdated = true;
          return {
            ...prize,
            winningNumber: undefined,
            winnerName: undefined,
            winnerPhone: undefined,
            drawDate: undefined,
            winnerPaymentMethod: undefined,
          };
        }
        return prize;
      });

      updateRaffle({ ...raffle, numbers: updatedNumbers, prizes: prizesUpdated ? updatedPrizes : raffle.prizes });
      return true;
    }
    return false;
  };


  return (
    <RaffleContext.Provider value={{ 
        raffles, 
        isLoading: isLoading || authIsLoading, //isLoading now also considers authIsLoading
        addRaffle, 
        getRaffleById, 
        updateRaffle, 
        editRaffle, 
        purchaseNumbers, 
        recordPrizeWinner, 
        closeRaffle, 
        updatePendingPayment, 
        deleteRaffle, 
        updateBuyerDetails, 
        cancelNumberPurchase 
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
