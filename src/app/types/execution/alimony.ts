/**
 * Alimony calculation and data shapes.
 */

// ═══════════════════════════════════════════════════════════════════════════
// ALIMONY TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface AlimonyCalculation {
    monthlyAmount: number;
    numberOfMonths: number;
    totalAccumulated: number;
    startDate: string;
    lastCalculationDate: string;
}

export interface AlimonyData {
    monthly: number;
    calculated: AlimonyCalculation;
    childrenCount?: number;
    wifeAmount?: number;
    childAmount?: number;
}
