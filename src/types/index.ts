
export interface Country {
  name: string;
  code: string;
  currencyCode: string;
  currencySymbol: string;
}

export interface RaffleNumber {
  id: number; // The actual number being sold, e.g., 1, 2, 3...
  status: 'Available' | 'Purchased' | 'PendingPayment';
  buyerName?: string;
  buyerPhone?: string;
  paymentMethod?: 'Cash' | 'Transfer' | 'Pending';
  purchaseDate?: string; // ISO string
}

export interface Prize {
  id: string; // uuid for React key
  description: string;
  order: number; // To maintain major to minor order
  winningNumber?: number; // Assigned after draw
  winnerName?: string;
  winnerPhone?: string;
}

export interface Raffle {
  id: string; // uuid
  name: string; // Name or description of the raffle
  country: Country;
  totalNumbers: number;
  numberValue: number;
  prizes: Prize[];
  drawDate: string; // ISO string, e.g. "YYYY-MM-DD"
  status: 'Open' | 'Closed';
  numbers: RaffleNumber[]; // Array from 1 to totalNumbers
  createdAt: string; // ISO string
}

export type RaffleConfigurationFormInput = {
  name: string;
  countryCode: string;
  totalNumbers: number;
  numberValue: number;
  numberOfPrizes: number;
  prizes: { description: string }[];
  drawDate: Date;
};

export type PurchaseFormInput = {
  buyerName: string;
  buyerPhone: string;
  selectedNumbers: number[];
  paymentMethod: 'Cash' | 'Transfer' | 'Pending';
};
