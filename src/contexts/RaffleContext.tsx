'use client';

import type { Raffle, Prize, RaffleNumber } from '@/types';
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

    // Check if any number was actually updated (i.e., was available)
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
    <RaffleContext.Provider value={{ raffles, isLoading, addRaffle, getRaffleById, updateRaffle, purchaseNumbers, recordPrizeWinner, closeRaffle }}>
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
