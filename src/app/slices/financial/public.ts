/**
 * Public surface — شريحة العمليات المالية (FOC).
 * القشرة الفورية للإضبارة: `@/app/slices/financial/instant`
 * دفتر خفيف بلا FOC UI: `@/app/slices/financial/ledgerPublic`
 */
export { FinancialOperationsCenter } from '@/app/components/lawyer/FinancialOperationsCenter';
export type { FinancialOperationsCenterProps } from '@/app/components/lawyer/FinancialOperationsCenter';
export {
    formatIqdDisplay,
    formatNumberInput,
    parseAmount,
    emptyStore,
    parseUnifiedLedgerFromStorage,
    storageKey,
    type UnifiedLedgerTotalParams,
} from '@/app/slices/financial/ledgerPublic';
