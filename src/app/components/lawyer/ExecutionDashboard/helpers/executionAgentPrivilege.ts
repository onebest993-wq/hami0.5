/**
 * حراسة صلاحية وكيل المدين — ما يُخفى في الواجهة يجب أن يُرفض في المعالج أيضاً.
 * لا تغيّر سير الأعمال الظاهر؛ تمنع الاستدعاء البرمجي/التسريب عبر props.
 */

export const CREDITOR_AGENT_ONLY_PERSIST_KEYS = [
    'paidDebt',
    'paidCourtFees',
    'paidDirectorateFees',
    'paidClientFees',
    'financialLedger',
    'seizedAssets',
    'seizedProperties',
    'seizedMovables',
    'thirdPartySeizures',
    'thirdPartySeizureAssets',
    'realEstateSeizureAssets',
    'seizureDraftsByDecisionId',
    'settlementAmount',
    'pendingSettlement',
    'settlement',
    'garnishment',
    'garnishmentAmount',
    'perDebtorGarnishments',
    'perDebtorSalaries',
] as const;

export type CreditorAgentOnlyPersistKey = (typeof CREDITOR_AGENT_ONLY_PERSIST_KEYS)[number];

export function patchTouchesCreditorAgentOnlyKeys(patch: Record<string, unknown>): boolean {
    for (const key of CREDITOR_AGENT_ONLY_PERSIST_KEYS) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
            return true;
        }
    }
    return false;
}

export function isCreditorAgentOnlyBlocked(isRepresentingDebtor: boolean | null | undefined): boolean {
    return Boolean(isRepresentingDebtor);
}

export function guardCreditorAgentMutation(args: {
    isRepresentingDebtor: boolean | null | undefined;
    showToast?: (message: string, type?: string) => void;
    actionLabel?: string;
}): boolean {
    if (!isCreditorAgentOnlyBlocked(args.isRepresentingDebtor)) {
        return true;
    }
    const label = args.actionLabel?.trim() || 'هذا الإجراء';
    args.showToast?.(`غير متاح لوكيل المدين: ${label}`, 'warning');
    return false;
}
