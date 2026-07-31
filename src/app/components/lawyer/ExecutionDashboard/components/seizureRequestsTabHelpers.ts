import type { SeizureRequestSubtype } from '@/app/utils/executorDecisionContracts';
import {
    getGoverningSeizureDecisionBySubtype,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export function resolveGoverningSalaryDecision(
    resolvedExecutionId: string,
    decisions: Record<string, unknown>[]
): any | null {
    const bySubtype = getGoverningSeizureDecisionBySubtype(
        resolvedExecutionId,
        'salary',
        decisions
    );
    if (bySubtype) return bySubtype as any;

    const isGuarantorRelated = (txt: string) => /الكفيل|كفيل/i.test(String(txt || ''));
    const isSalaryRelated = (txt: string) =>
        /حجز\s*راتب|حجز\s*الحوافز|الحوافز|المخصصات|الراتب/i.test(String(txt || ''));

    const candidates = decisions.filter((r) => {
        const rk = String((r as any)?.requestKind || '').trim();
        const rid = String((r as any)?.id || '').trim();
        const isSeizureLike = rk === 'seizure' || (!rk && /^seizure_req_/i.test(rid));
        if (!isSeizureLike) return false;
        const st = String((r as any)?.seizureSubtype || '').trim();
        if (st && st !== 'salary') return false;
        const title = String((r as any)?.title || '');
        const body = String((r as any)?.body || '');
        if (isGuarantorRelated(title) || isGuarantorRelated(body)) return false;
        return isSalaryRelated(title) || isSalaryRelated(body);
    });
    if (candidates.length === 0) return null;
    const first = candidates[0] as any;
    return candidates.reduce((acc: any, cur: any) => {
        const a = String(acc?.resolvedAt ?? acc?.date ?? '');
        const b = String(cur?.resolvedAt ?? cur?.date ?? '');
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, first) as any;
}

export function isSeizureRequestFullyRegistered(
    row: any,
    allDecisions: Record<string, unknown>[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    if (!isExecutorRowApprovedWorkflowActive(row, allDecisions)) return false;
    return Boolean(String(row.seizureRequestSavedAt || '').trim());
}

/** اكتمال التسجيل — يبقى زر «السجل» ظاهراً حتى أثناء الطعن */
export function isSeizureRegistrationComplete(
    row: any,
    allDecisions: Record<string, unknown>[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    return Boolean(String(row.seizureRequestSavedAt || '').trim());
}

export type UnifiedSeizureLogTab = 'movable' | 'property' | 'third_party' | 'salary';

export const SEIZURE_LOG_TAB_SUBTYPE: Record<UnifiedSeizureLogTab, SeizureRequestSubtype> = {
    movable: 'movable_auction',
    third_party: 'third_party',
    property: 'property',
    salary: 'salary',
};

export function openUnifiedSeizureLogTab(tab: UnifiedSeizureLogTab): void {
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-unified-seizure-log', { detail: { tab } })
        );
    } catch {
        /* ignore */
    }
}

export function parseIsoFromYmd(ymd: string): string | null {
    const t = String(ymd || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    const dt = new Date(`${t}T00:00:00.000Z`);
    return Number.isFinite(dt.getTime()) ? dt.toISOString() : null;
}

export function normalizeDigitsOnly(raw: string): string {
    const t = String(raw || '');
    const ascii = t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    return ascii.replace(/[^\d]/g, '');
}
