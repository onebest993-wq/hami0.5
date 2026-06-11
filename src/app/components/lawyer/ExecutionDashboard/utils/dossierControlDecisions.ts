import type { DossierActionType } from '../components/DossierActionsModal';
import {
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';

export const DOSSIER_ACTION_DECISION_TITLES: Record<DossierActionType, string> = {
    delegation: 'طلب الإنابة التنفيذية',
    unify: 'طلب توحيد الأضابير',
    transfer: 'طلب نقل الإضبارة',
    renew: 'طلب تجديد الإضبارة',
    inaba_correspondence: 'طلب مخاطبة مديرية الانابة',
};

export function findDossierControlDecisionRow(
    decisions: Record<string, unknown>[],
    actionType: DossierActionType
): Record<string, unknown> | null {
    const title = DOSSIER_ACTION_DECISION_TITLES[actionType];
    const matches = (Array.isArray(decisions) ? decisions : []).filter((r) => {
        if (String((r as any)?.requestKind || '') !== 'special_followup') return false;
        return String((r as any)?.title || '').trim() === title;
    });
    if (!matches.length) return null;
    const sorted = [...matches].sort((a, b) => {
        const da = String((a as any)?.resolvedAt ?? (a as any)?.date ?? '');
        const db = String((b as any)?.resolvedAt ?? (b as any)?.date ?? '');
        return db.localeCompare(da, undefined, { numeric: true });
    });
    const pending = sorted.find((r) => {
        const o = String((r as any)?.executorOutcome ?? 'pending');
        return o === 'pending' || o === '';
    });
    if (pending) return pending;
    const rejected = sorted.find((r) => isExecutorRowRejectedAndFinal(r));
    if (rejected) return rejected;
    const approved = sorted.find((r) => isExecutorRowEffectivelyApproved(r));
    return approved || sorted[0] || null;
}

export function dossierDecisionShowsInlineActions(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    const out = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
    if (out === 'withdrawn' || (row as { lawyerWithdrawn?: boolean }).lawyerWithdrawn) return true;
    if (isExecutorRowEffectivelyApproved(row)) return true;
    const pending = out === 'pending' || out === '';
    return pending || isExecutorRowRejectedAndFinal(row);
}
