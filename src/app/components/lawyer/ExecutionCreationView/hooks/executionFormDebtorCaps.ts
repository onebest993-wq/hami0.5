import { parseMoneyInput } from './executionFormMoney';

/** أقصى مبلغ يدوي لمدين مستقل — لا يتجاوز إجمالي الدين ولا مجموع المستقلين الآخرين */
export function maxManualIndependentDebtForSlot(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
): number {
    const total = Math.max(0, Math.round(globalClaimTotal));
    if (total <= 0 || debtorSolidaryFlags[slotIndex]) return 0;
    const otherIndependentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary || i === slotIndex) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    return Math.max(0, total - otherIndependentSum);
}

export function capManualIndependentDebtRaw(
    globalClaimTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
    raw: string,
): string {
    const cleaned = String(raw || '').replace(/,/g, '');
    if (cleaned === '') return '';
    const parsed = parseMoneyInput(cleaned);
    const max = maxManualIndependentDebtForSlot(
        globalClaimTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
    );
    if (parsed <= max) return cleaned;
    return String(max);
}

/** أقصى حصة أتعاب لمدين مستقل — لا تتجاوز إجمالي الأتعاب المحكوم بها */
export function maxManualIndependentLawyerFeesForSlot(
    globalLawyerFeesTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
): number {
    const total = Math.max(0, Math.round(globalLawyerFeesTotal));
    if (total <= 0 || debtorSolidaryFlags[slotIndex]) return 0;
    const otherIndependentSum = debtorSolidaryFlags.reduce((sum, solidary, i) => {
        if (solidary || i === slotIndex) return sum;
        return sum + Math.max(0, Math.round(manualBySlot[i] ?? 0));
    }, 0);
    return Math.max(0, total - otherIndependentSum);
}

export function capManualIndependentLawyerFeesRaw(
    globalLawyerFeesTotal: number,
    debtorSolidaryFlags: boolean[],
    manualBySlot: number[],
    slotIndex: number,
    raw: string,
): string {
    const cleaned = String(raw || '').replace(/,/g, '');
    if (cleaned === '') return '';
    const parsed = parseMoneyInput(cleaned);
    const max = maxManualIndependentLawyerFeesForSlot(
        globalLawyerFeesTotal,
        debtorSolidaryFlags,
        manualBySlot,
        slotIndex,
    );
    if (parsed <= max) return cleaned;
    return String(max);
}

