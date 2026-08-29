/**
 * Financial / payment / expense types.
 */

export interface Payment {
    id: string;
    amount: number;
    date: string;
    type: PaymentType;
    method?: PaymentMethod;
    notes?: string;
    receipt?: string;
}

export type PaymentType = 'full' | 'partial' | 'installment';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'card';

export interface FinancialData {
    totalClaimed: number;
    totalAwarded?: number;
    courtFees?: number;
    lawyerFees?: number;
    expenses?: Expense[];
    payments?: Payment[];
}

export interface Expense {
    id: string;
    type: ExpenseType;
    amount: number;
    date: string;
    description?: string;
    receipt?: string;
}

export type ExpenseType =
    | 'court_fees'
    | 'lawyer_fees'
    | 'expert_fees'
    | 'travel'
    | 'documents'
    | 'other';
