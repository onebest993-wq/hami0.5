/**
 * ⚖️ ALIMONY PAYMENT ENGINE
 * V18 - Iraqi Law Compliant Payment Tracker
 * 
 * Features:
 * - Auto-generate monthly installments
 * - Track overdue payments
 * - Calculate accumulated alimony dynamically
 * - Guarantor management for freelancers
 */

import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';

export interface AlimonyInstallment {
    id: string;
    dueDate: string; // ISO date (e.g., "2026-03-01")
    amount: number;
    status: 'paid' | 'overdue' | 'upcoming';
    paidDate?: string; // ISO date when actually paid
    type: 'wife' | 'children' | 'mixed';
}

export interface GuarantorInfo {
    name: string;
    phone: string;
    address: string;
    nationalId: string;
    registeredDate: string; // ISO date
}

export interface AlimonyData {
    // Monthly amounts
    monthlyWifeAlimony: number;
    monthlyChildrenAlimony: number;
    childrenCount: number;
    
    // Past/Accumulated
    pastWifeAlimony: number;
    pastChildrenAlimony: number;
    
    // Payment tracking
    installments: AlimonyInstallment[];
    
    // Guarantor (required for freelancers)
    guarantor?: GuarantorInfo;
    
    // Start date for tracking
    trackingStartDate: string; // ISO date
}

/**
 * Generate monthly installments from start date until today
 */
export const generateMonthlyInstallments = (
    startDate: string,
    monthlyAmount: number,
    type: 'wife' | 'children' | 'mixed'
): AlimonyInstallment[] => {
    const installments: AlimonyInstallment[] = [];
    const start = new Date(startDate);
    const today = new Date();
    
    // Set to first day of month
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    
    let current = new Date(start);
    
    while (current <= today) {
        const dueDate = new Date(current);
        const installmentId = `alimony_${dueDate.getFullYear()}_${String(dueDate.getMonth() + 1).padStart(2, '0')}`;
        
        // Determine status
        let status: 'paid' | 'overdue' | 'upcoming' = 'upcoming';
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        
        if (dueDate < now) {
            status = 'overdue'; // Default to overdue (will be updated if payment recorded)
        }
        
        installments.push({
            id: installmentId,
            dueDate: dueDate.toISOString(),
            amount: monthlyAmount,
            status,
            type
        });
        
        // Move to next month
        current.setMonth(current.getMonth() + 1);
    }
    
    return installments;
};

/**
 * Calculate total overdue amount
 */
export const calculateOverdueAmount = (installments: AlimonyInstallment[]): number => {
    return installments
        .filter(i => i.status === 'overdue')
        .reduce((sum, i) => sum + i.amount, 0);
};

/**
 * Count overdue installments
 */
export const countOverdueInstallments = (installments: AlimonyInstallment[]): number => {
    return installments.filter(i => i.status === 'overdue').length;
};

/**
 * Mark installment as paid
 */
export const markInstallmentAsPaid = (
    installments: AlimonyInstallment[],
    installmentId: string,
    paidDate: string
): AlimonyInstallment[] => {
    return installments.map(i => {
        if (i.id === installmentId) {
            return {
                ...i,
                status: 'paid' as const,
                paidDate
            };
        }
        return i;
    });
};

/**
 * Get days remaining in current cycle (until next due date)
 */
export const getDaysRemainingInCycle = (): number => {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const diffTime = nextMonth.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Initialize alimony data for a new execution
 */
export const initializeAlimonyData = (
    monthlyWifeAlimony: number,
    monthlyChildrenAlimony: number,
    childrenCount: number,
    pastWifeAlimony: number = 0,
    pastChildrenAlimony: number = 0,
    startDate?: string
): AlimonyData => {
    const trackingStartDate = startDate || new Date().toISOString();
    const totalMonthly = monthlyWifeAlimony + (monthlyChildrenAlimony * childrenCount);
    
    return {
        monthlyWifeAlimony,
        monthlyChildrenAlimony,
        childrenCount,
        pastWifeAlimony,
        pastChildrenAlimony,
        installments: generateMonthlyInstallments(trackingStartDate, totalMonthly, 'mixed'),
        trackingStartDate
    };
};

/**
 * Add guarantor information
 */
export const registerGuarantor = (
    alimonyData: AlimonyData,
    guarantorInfo: GuarantorInfo
): AlimonyData => {
    return {
        ...alimonyData,
        guarantor: guarantorInfo
    };
};

/**
 * Check if guarantor is required (for freelancers in Iraqi law)
 */
export const isGuarantorRequired = (debtorJob: string): boolean => {
    return debtorJob === 'كاسب';
};

/**
 * Format date to Arabic
 */
export const formatDateArabic = (isoDate: string): string => {
    const date = new Date(isoDate);
    const months = [
        'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
        'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'
    ];
    
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Update alimony data in localStorage
 */
export const saveAlimonyDataToExecution = (executionId: string, alimonyData: AlimonyData): void => {
    const storageKey = executionStorageKey(executionId);
    const current = storageCache.get(storageKey);
    if (current && typeof current === 'object') {
        storageCache.set(storageKey, {
            ...current,
            alimonyData,
        });
    }
};

/**
 * Load alimony data from execution
 */
export const loadAlimonyDataFromExecution = (executionId: string): AlimonyData | null => {
    const current = storageCache.get(executionStorageKey(executionId));
    if (current && typeof current === 'object') {
        return (current as Record<string, unknown>).alimonyData as AlimonyData | null;
    }
    return null;
};
