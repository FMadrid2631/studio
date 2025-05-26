
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
  referenceValue?: number; // Reference value of the prize
  winningNumber?: number; // Assigned after draw
  winnerName?: string;
  winnerPhone?: string;
  drawDate?: string; // ISO string of when the prize was drawn
  winnerPaymentMethod?: 'Cash' | 'Transfer' | 'Pending'; // Payment method used for the winning number
}

export interface BankDetails {
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  accountType?: string; // e.g., Savings, Checking
  identificationNumber?: string; // e.g., CUIT, RUT, CPF for account holder
  transferInstructions?: string; // Optional additional instructions
}

export interface Raffle {
  id: string; // uuid
  name: string; // Name or description of the raffle
  country: Country;
  totalNumbers: number;
  numberValue: number;
  prizes: Prize[];
  drawDate: string; // ISO string, e.g. "YYYY-MM-DD" (general draw date for the raffle event)
  status: 'Open' | 'Closed';
  numbers: RaffleNumber[]; // Array from 1 to totalNumbers
  createdAt: string; // ISO string
  bankDetails?: BankDetails;
}

export type RaffleConfigurationFormInput = {
  name: string;
  countryCode: string;
  totalNumbers: number;
  numberValue: number;
  numberOfPrizes: number; // Used by the form to control field array
  prizes: { description: string; referenceValue?: number }[];
  drawDate: Date; // General draw date for the raffle event
  // Bank Details - all optional
  bankName?: string;
  accountHolderName?: string;
  accountNumber?: string;
  accountType?: string;
  identificationNumber?: string;
  transferInstructions?: string;
};

// Used when submitting an update to an existing raffle where some fields might be locked.
// For now, if editable, all fields in RaffleConfigurationFormInput are editable.
export type RaffleUpdateFormInput = RaffleConfigurationFormInput;


export type PurchaseFormInput = {
  buyerName: string;
  buyerPhone: string;
  selectedNumbers: number[];
  paymentMethod: 'Cash' | 'Transfer' | 'Pending';
};

export type EditBuyerFormInput = {
  newBuyerName: string;
  newBuyerPhone: string;
};

// Authentication related types
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  rut?: string; // Assuming Chilean RUT
}

export type LoginFormInput = {
  email: string;
  password_login: string; // Renamed to avoid conflict if signup form is on same conceptual page later
};

export type SignupFormInput = {
  displayName: string;
  rut: string;
  email: string;
  password_signup: string; // Renamed for clarity
  confirmPassword?: string; // Optional for now, good practice to add
};

export type EditProfileFormInput = {
  displayName: string;
  rut: string;
};

