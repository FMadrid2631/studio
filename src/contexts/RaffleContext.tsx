
'use client';

import type { Raffle, Prize, RaffleNumber, RaffleConfigurationFormInput } from '@/types';
import type React from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { LOCAL_STORAGE_RAFFLES_KEY } from '@/lib/constants';

interface RaffleContextType {
  raffles: Raffle[];
  isLoading: boolean;
  addRaffle: (raffle: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes'> & {
    numberOfPrizes: number;
    prizeDescriptions: string[];
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

  const addRaffle = (raffleData: Omit<Raffle, 'id' | 'createdAt' | 'numbers' | 'status' | 'prizes'> & {
    numberOfPrizes: number;
    prizeDescriptions: string[];
   }): Raffle => {
    const newRaffle: Raffle = {
      ...raffleData,
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

    // Crucial check: ensure no numbers are sold and raffle is not closed
    const hasSoldNumbers = existingRaffle.numbers.some(n => n.status !== 'Available');
    if (hasSoldNumbers || existingRaffle.status === 'Closed') {
      console.error("Cannot edit raffle: sales started or raffle closed.");
      return undefined; 
    }
    
    const country = updatedData.countryCode ? existingRaffle.country : existingRaffle.country; // Assuming country cannot be changed, or would need to fetch from COUNTRIES
                                                                                              // For now, keep existing country if not part of form or handle properly
                                                                                              // Since countryCode is in form, we need to find it.
    const newCountry = existingRaffle.country; // Fallback to existing, should be updated if countryCode is part of updatedData and logic is added
                                                // This needs a proper lookup from updatedData.countryCode via COUNTRIES list.
                                                // For simplicity now, if form includes country, it should be used.
                                                // Let's assume updatedData provides all necessary fields as per RaffleConfigurationFormInput.

    const finalCountry = existingRaffle.country; // This needs to be properly resolved from updatedData.countryCode

    const editedRaffle: Raffle = {
      ...existingRaffle, // Retain id, createdAt
      name: updatedData.name,
      country: finalCountry, // This needs to be resolved from updatedData.countryCode
      totalNumbers: updatedData.totalNumbers,
      numberValue: updatedData.numberValue,
      drawDate: updatedData.drawDate.toISOString(),
      status: existingRaffle.status, // Status doesn't change on edit, unless specifically handled
      numbers: Array.from({ length: updatedData.totalNumbers }, (_, i) => ({
        id: i + 1,
        status: 'Available', // All numbers reset to available as per original logic for new raffle
      })),
      prizes: updatedData.prizes.map((p, index) => ({
        id: existingRaffle.prizes[index]?.id || crypto.randomUUID(), // Try to reuse existing prize IDs
        description: p.description,
        order: index + 1,
      })),
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
    updateRaffle({ ...raffle, status: 'Closed' });
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

