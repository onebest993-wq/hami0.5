import type { PendingSettlement, UnifiedLedgerStore } from './types';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';

/** مدة التسوية الافتراضية — عداد السداد في الخلفية */
export const SETTLEMENT_DEFAULT_DUE_DAYS = 30;

export type SettlementSalaryConflictChoice = 'keep_salary' | 'keep_settlement' | 'cancel';

export const SETTLEMENT_SALARY_CONFLICT_MESSAGE =
    'لا يجوز الجمع بين التسوية وحجز الراتب في مسار واحد.\n\nاختر المسار الذي تريد الإبقاء عليه:';

/** مسار حجز راتب نشط — يُخفى زر التسوية فوراً */
export function hasActiveSalarySeizurePath(input: {
    garnishment?: boolean;
    seizedAssets?: unknown[] | null;
}): boolean {
    if (input.garnishment) return true;
    for (const raw of input.seizedAssets || []) {
        if (!raw || typeof raw !== 'object') continue;
        const a = raw as Record<string, unknown>;
        if (!isSalarySeizureAsset(a)) continue;
        const st = String(a.status || '').trim();
        if (st === 'seized' || st === 'pending') return true;
    }
    return false;
}

export function hasActiveSettlementPath(
    pendingSettlement: PendingSettlement | null | undefined
): boolean {
    return Boolean(pendingSettlement);
}

export function resolveSalaryGarnishmentBlockedBySettlement(
    pendingSettlement: PendingSettlement | null | undefined
): boolean {
    return hasActiveSettlementPath(pendingSettlement);
}

/** إظهار زر طلب حجز الراتب — لا يُخفى بسبب تسوية معلّقة (يُحسم عند الإكمال) */
export function resolveSalaryGarnishmentButtonVisible(input: {
    matrixAllowsSalary: boolean;
    matrixBlocksSeizure: boolean;
}): boolean {
    if (!input.matrixAllowsSalary || input.matrixBlocksSeizure) return false;
    return true;
}

export function resolveSettlementBlockedBySalarySeizure(input: {
    garnishment?: boolean;
    seizedAssets?: unknown[] | null;
}): boolean {
    return hasActiveSalarySeizurePath(input);
}

export function clearSettlementFromStore(store: UnifiedLedgerStore): UnifiedLedgerStore {
    return {
        ...store,
        pendingSettlement: null,
        settlementBreachTriggeredAt: null,
    };
}

export function clearSalarySeizureFromStore(store: UnifiedLedgerStore): UnifiedLedgerStore {
    return {
        ...store,
        garnishment: false,
    };
}

export function releaseSalarySeizedAssets<T extends Record<string, unknown>>(seizedAssets: T[]): T[] {
    return seizedAssets.map((a) => {
        if (!isSalarySeizureAsset(a)) return a;
        const st = String(a.status || '').trim();
        if (st !== 'seized' && st !== 'pending') return a;
        return {
            ...a,
            status: 'released',
            seizure_record_locked: true,
        };
    });
}

export async function promptSettlementSalaryConflictChoice(
    confirm: (
        message: string,
        options?: { title?: string; confirmText?: string; cancelText?: string }
    ) => Promise<boolean>
): Promise<SettlementSalaryConflictChoice> {
    const keepSalary = await confirm(SETTLEMENT_SALARY_CONFLICT_MESSAGE, {
        title: 'تسوية أم حجز راتب؟',
        confirmText: 'الإبقاء على حجز الراتب',
        cancelText: 'الإبقاء على التسوية',
    });
    return keepSalary ? 'keep_salary' : 'keep_settlement';
}
