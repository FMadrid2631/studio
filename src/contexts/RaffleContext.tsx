
'use client';

import type { Raffle, Prize, RaffleNumber, RaffleConfigurationFormInput, BankDetails } from '@/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LOCAL_STORAGE_RAFFLES_KEY } from '@/lib/constants';
import { COUNTRIES } from '@/lib/countries'; // Import COUNTRIES

interface RaffleContextType {
  raffles: Raffle[];
  isLoading: boolean;
  addRaffle: (raffle: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    numberOfPrizes: number;
    prizeDescriptions: string[];
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
  recordPrizeWinner: (raffleId: string, prizeOrder: number, winningNumber: number, winnerName: string, winnerPhone: string) => void;
  closeRaffle: (raffleId: string) => void;
}

const RaffleContext = createContext<RaffleContextType | undefined>(undefined);

export const RaffleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedRaffles = localStorage.getItem(LOCAL_STORAGE_RAFFLES_KEY);
      if (storedRaffles) {
        setRaffles(JSON.parse(storedRaffles));
      }
    } catch (error) {
      console.error("Failed to load raffles from localStorage:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveRaffles = useCallback((updatedRaffles: Raffle[]) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_RAFFLES_KEY, JSON.stringify(updatedRaffles));
      setRaffles(updatedRaffles);
    } catch (error) {
      console.error("Failed to save raffles to localStorage:", error);
    }
  }, []);

  const addRaffle = (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes' | 'bankDetails'> & {
    numberOfPrizes: number;
    prizeDescriptions: string[];
    bankName?: string;
    accountHolderName?: string;
    accountNumber?: string;
    accountType?: string;
    identificationNumber?: string;
    transferInstructions?: string;
   }): Raffle => {
    const country = COUNTRIES.find(c => c.code === raffleData.countryCode);
    if (!country) {
      // This should ideally be caught by form validation, but as a safeguard:
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
      country: country, // Use the resolved country object
      totalNumbers: raffleData.totalNumbers,
      numberValue: raffleData.numberValue,
      drawDate: raffleData.drawDate.toISOString(), // Ensure drawDate is string
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'Open',
      numbers: Array.from({ length: raffleData.totalNumbers }, (_, i) => ({
        id: i + 1,
        status: 'Available',
      })),
      prizes: raffleData.prizeDescriptions.map((desc, index) => ({
        id: crypto.randomUUID(),
        description: desc,
        order: index + 1,
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
      })),
      numbers: Array.from({ length: updatedData.totalNumbers }, (_, i) => ({ // Reset numbers if totalNumbers changes
        id: i + 1,
        status: 'Available',
      })),
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

  const recordPrizeWinner = (raffleId: string, prizeOrder: number, winningNumber: number, winnerName: string, winnerPhone: string) => {
    const raffle = getRaffleById(raffleId);
    if (!raffle) return;

    const updatedPrizes = raffle.prizes.map(prize => {
      if (prize.order === prizeOrder) {
        return { ...prize, winningNumber, winnerName, winnerPhone };
      }
      return prize;
    });
    updateRaffle({ ...raffle, prizes: updatedPrizes });
  };

  const closeRaffle = (raffleId: string) => {
    const raffle = getRaffleById(raffleId);
    if (!raffle) return;
    // Ensure all prizes are awarded before closing
    const allPrizesAwarded = raffle.prizes.every(p => !!p.winningNumber);
    if (allPrizesAwarded) {
      updateRaffle({ ...raffle, status: 'Closed' });
    } else {
      console.warn("Attempted to close raffle before all prizes were awarded.");
    }
  };


  return (
    <RaffleContext.Provider value={{ raffles, isLoading, addRaffle, getRaffleById, updateRaffle, editRaffle, purchaseNumbers, recordPrizeWinner, closeRaffle }}>
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
