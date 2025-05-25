
'use client';

import type { Raffle, Prize, RaffleNumber, RaffleConfigurationFormInput, BankDetails } from '@/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LOCAL_STORAGE_RAFFLES_KEY } from '@/lib/constants';
import { COUNTRIES } from '@/lib/countries'; // Import COUNTRIES

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
   }) => Raffle;
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
}

const RaffleContext = createContext<RaffleContextType | undefined>(undefined);

export const RaffleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const saveRaffles = useCallback((updatedRaffles: Raffle[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RAFFLES_KEY, JSON.stringify(updatedRaffles));
      setRaffles(updatedRaffles);
    } catch (error) {
      console.error("Failed to save raffles to localStorage:", error);
    }
  }, []);

  useEffect(() => {
    let initialRaffles: Raffle[] = [];
    try {
      const storedRaffles = localStorage.getItem(LOCAL_STORAGE_RAFFLES_KEY);
      if (storedRaffles) {
        initialRaffles = JSON.parse(storedRaffles) as Raffle[];
      }
    } catch (error) {
      console.error("Failed to load raffles from localStorage:", error);
    }

    let madeChanges = false;
    const checkedRaffles = initialRaffles.map(raffle => {
      let currentRaffle = { ...raffle };
      if (currentRaffle.status === 'Open' && currentRaffle.prizes && currentRaffle.prizes.length > 0) {
        const allPrizesAwarded = currentRaffle.prizes.every(p => !!p.winningNumber);
        if (allPrizesAwarded) {
          madeChanges = true;
          currentRaffle.status = 'Closed';
        }
      }
      if (currentRaffle.prizes) {
        const prizesUpdated = currentRaffle.prizes.map(p => {
          if (p.winningNumber && !p.winnerPaymentMethod) {
            const winningRaffleNumber = currentRaffle.numbers.find(rn => rn.id === p.winningNumber && rn.status === 'Purchased');
            if (winningRaffleNumber && winningRaffleNumber.paymentMethod) {
              madeChanges = true;
              return { ...p, winnerPaymentMethod: winningRaffleNumber.paymentMethod };
            }
          }
          return p;
        });
        if (prizesUpdated.some((p, i) => p !== currentRaffle.prizes[i])) { // Check if prizes actually changed
          madeChanges = true;
          currentRaffle.prizes = prizesUpdated;
        }
      }
      return currentRaffle;
    });

    if (madeChanges) {
      saveRaffles(checkedRaffles);
    } else {
      setRaffles(initialRaffles);
    }
    setIsLoading(false);
  }, [saveRaffles]);


  const addRaffle = (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    prizes: { description: string; referenceValue?: number }[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }): Raffle => {
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
      })),
      bankDetails: bankDetails,
    };
    const updatedRaffles = [...raffles, newRaffle];
    saveRaffles(updatedRaffles);
    return newRaffle;
  };

  const getRaffleById = (id: string): Raffle | undefined => {
    return raffles.find(raffle => raffle.id === id);
  };

  const updateRaffle = (updatedRaffle: Raffle) => {
    const updatedRaffles = raffles.map(r => r.id === updatedRaffle.id ? updatedRaffle : r);
    saveRaffles(updatedRaffles);
  };

  const editRaffle = (raffleId: string, updatedData: RaffleConfigurationFormInput): Raffle | undefined => {
    const existingRaffle = getRaffleById(raffleId);
    if (!existingRaffle) return undefined;

    const hasSoldNumbers = existingRaffle.numbers.some(n => n.status !== 'Available');
    if (hasSoldNumbers || existingRaffle.status === 'Closed') {
      console.error("Cannot edit raffle: sales started or raffle closed.");
      return undefined;
    }

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
      totalNumbers: updatedData.totalNumbers,
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
    if (!raffle) return false;

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
    if (!raffle) return false;

    let numberUpdated = false;
    const updatedNumbers = raffle.numbers.map(num => {
      if (num.id === numberId && num.status === 'PendingPayment') {
        numberUpdated = true;
        return {
          ...num,
          status: 'Purchased',
          paymentMethod: newPaymentMethod,
          purchaseDate: new Date().toISOString(), // Update purchase date to reflect confirmation
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


  return (
    <RaffleContext.Provider value={{ raffles, isLoading, addRaffle, getRaffleById, updateRaffle, editRaffle, purchaseNumbers, recordPrizeWinner, closeRaffle, updatePendingPayment }}>
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
