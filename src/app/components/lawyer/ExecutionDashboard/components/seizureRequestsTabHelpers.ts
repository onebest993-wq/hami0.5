import type { SeizureRequestSubtype } from '@/app/utils/executorDecisionContracts';
import {
    getGoverningSeizureDecisionBySubtype,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

type SeizureDecisionRow = Record<string, unknown>;

function decisionText(row: SeizureDecisionRow, key: string): string {
    return String(row[key] ?? '');
}

function decisionIsoStamp(row: SeizureDecisionRow): string {
    return String(row.resolvedAt ?? row.date ?? '');
}

export function resolveGoverningSalaryDecision(
    resolvedExecutionId: string,
    decisions: SeizureDecisionRow[]
): SeizureDecisionRow | null {
    const bySubtype = getGoverningSeizureDecisionBySubtype(
        resolvedExecutionId,
        'salary',
        decisions
    );
    if (bySubtype) return bySubtype;

    const isGuarantorRelated = (txt: string) => /الكفيل|كفيل/i.test(String(txt || ''));
    const isSalaryRelated = (txt: string) =>
        /حجز\s*راتب|حجز\s*الحوافز|الحوافز|المخصصات|الراتب/i.test(String(txt || ''));

    const candidates = decisions.filter((r) => {
        const rk = decisionText(r, 'requestKind').trim();
        const rid = decisionText(r, 'id').trim();
        const isSeizureLike = rk === 'seizure' || (!rk && /^seizure_req_/i.test(rid));
        if (!isSeizureLike) return false;
        const st = decisionText(r, 'seizureSubtype').trim();
        if (st && st !== 'salary') return false;
        const title = decisionText(r, 'title');
        const body = decisionText(r, 'body');
        if (isGuarantorRelated(title) || isGuarantorRelated(body)) return false;
        return isSalaryRelated(title) || isSalaryRelated(body);
    });
    if (candidates.length === 0) return null;
    const first = candidates[0];
    if (!first) return null;
    return candidates.reduce((acc, cur) => {
        const a = decisionIsoStamp(acc);
        const b = decisionIsoStamp(cur);
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, first);
}

export function isSeizureRequestFullyRegistered(
    row: SeizureDecisionRow | null | undefined,
    allDecisions: SeizureDecisionRow[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    if (!isExecutorRowApprovedWorkflowActive(row, allDecisions)) return false;
    return Boolean(decisionText(row, 'seizureRequestSavedAt').trim());
}

/** اكتمال التسجيل — يبقى زر «السجل» ظاهراً حتى أثناء الطعن */
export function isSeizureRegistrationComplete(
    row: SeizureDecisionRow | null | undefined,
    allDecisions: SeizureDecisionRow[]
): boolean {
    if (!row?.id) return false;
    if (isExecutorRowRejectedAndFinal(row)) return false;
    if (isExecutorHubRowInactiveForGoverning(row, allDecisions)) return false;
    return Boolean(decisionText(row, 'seizureRequestSavedAt').trim());
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
