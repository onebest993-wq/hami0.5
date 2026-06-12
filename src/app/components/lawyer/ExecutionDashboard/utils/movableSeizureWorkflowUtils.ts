import type { SeizedMovable } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    isExecutorHubRowInactiveForGoverning,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { isDecisionResolvedApproved, normalizePropertySeizureStatus, stepStatusForIndex } from './propertySeizureWorkflowUtils';

export { normalizePropertySeizureStatus as normalizeMovableSeizureStatus, stepStatusForIndex };

export function parseSeizedMovableIdFromDecision(row: Record<string, unknown>): string {
    const rawJson = String(row?.seizurePayloadJson || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedMovableId?: string };
        return String(v?.seizedMovableId ?? '').trim();
    } catch {
        return '';
    }
}

export function findSeizureDecisionForMovable(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedMovableId: string,
    opts?: { pendingOnly?: boolean }
): Record<string, unknown> | null {
    const mid = String(seizedMovableId || '').trim();
    const st = String(subtype || '').trim();
    if (!st) return null;
    const hits = decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (String(r?.seizureSubtype || '').trim() !== st) return false;
        if (mid) {
            const linked = parseSeizedMovableIdFromDecision(r);
            if (linked && linked !== mid) return false;
        }
        if (opts?.pendingOnly) {
            const pending =
                String(r?.executorOutcome ?? 'pending') === 'pending' ||
                String(r?.executorOutcome ?? '') === '';
            return pending;
        }
        return true;
    });
    if (hits.length === 0) return null;
    return hits.reduce((acc, cur) => {
        const a = String((acc as any).resolvedAt ?? (acc as any).date ?? '');
        const b = String((cur as any).resolvedAt ?? (cur as any).date ?? '');
        return b.localeCompare(a, undefined, { numeric: true }) > 0 ? cur : acc;
    }, hits[0]!);
}

export function listPendingMovableSeizureDecisions(
    decisions: Array<Record<string, unknown>>,
    seizedMovableId: string
): Array<Record<string, unknown>> {
    const mid = String(seizedMovableId || '').trim();
    return decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (mid) {
            const linked = parseSeizedMovableIdFromDecision(r);
            if (linked && linked !== mid) return false;
        }
        const pending =
            String(r?.executorOutcome ?? 'pending') === 'pending' ||
            String(r?.executorOutcome ?? '') === '';
        return pending;
    });
}

export function isStaleMovableInitSeizureDecision(
    row: Record<string, unknown>,
    movable: SeizedMovable
): boolean {
    const subtype = String(row?.seizureSubtype || '').trim();
    if (subtype !== 'movable_auction') return false;
    return Boolean(String(movable?.id || '').trim());
}

export function executorSubtypesForMovableWorkflowStatus(
    status: string,
    movable: SeizedMovable
): string[] {
    const hasMark = Boolean(String(movable.seizureMarkLetterNumber || '').trim());
    const norm = normalizePropertySeizureStatus(status);

    if (norm === 'sold') {
        return ['movable_final_award'];
    }
    if (norm === 'initial_award') {
        return ['movable_final_award', 'movable_reauction_default'];
    }
    if (norm === 'no_bidders') return ['movable_auction_date'];
    if (norm === 'estimation_objected') return ['movable_expert_committee'];
    if (norm === 'valued') return ['movable_auction_date', 'movable_expert_objection'];
    if (norm === 'published') return [];
    if (norm === 'seized') return hasMark ? ['movable_expert'] : [];
    return [];
}

export function filterRelevantPendingMovableDecisions(
    decisions: Array<Record<string, unknown>>,
    movable: SeizedMovable,
    status: string
): Array<Record<string, unknown>> {
    const mid = String(movable.id || '').trim();
    const allowed = new Set(executorSubtypesForMovableWorkflowStatus(status, movable));
    return listPendingMovableSeizureDecisions(decisions, mid).filter((row) => {
        if (isStaleMovableInitSeizureDecision(row, movable)) return false;
        const st = String(row?.seizureSubtype || '').trim();
        if (!st) return false;
        return allowed.has(st);
    });
}

/** قرار موافق عليه ولم يُحفظ بعد في سجل المنقول */
export function findApprovedUnsavedMovableDecision(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedMovableId: string
): Record<string, unknown> | null {
    const row = findSeizureDecisionForMovable(decisions, subtype, seizedMovableId);
    if (!row || !isDecisionResolvedApproved(row, decisions)) return null;
    if (String(row.seizureRequestSavedAt || '').trim()) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    return row;
}

export function movableSeizureRequestBody(m: SeizedMovable, lead: string): string {
    return [
        lead,
        `وصف المال: ${String(m.movableDescription || '').trim()}`,
        `المكان: ${String(m.movableLocation || '').trim()}`,
    ]
        .filter(Boolean)
        .join('\n');
}

export function movableWorkflowActiveStepIndex(status: string, m: SeizedMovable): number {
    const norm = normalizePropertySeizureStatus(status);
    if (norm === 'sold') return 7;
    if (norm === 'initial_award') return 7;
    if (norm === 'no_bidders') return 6;
    if (norm === 'published') {
        const needsPub =
            !String(m.newspaperName || '').trim() || !String(m.publicationDateYmd || '').trim();
        return needsPub ? 4 : 5;
    }
    if (norm === 'estimation_objected') return 3;
    if (norm === 'valued') return 2;
    if (norm === 'seized') {
        return String(m.seizureMarkLetterNumber || '').trim() ? 1 : 0;
    }
    return 0;
}

/** مجموعات طلبات متعارضة — لا يُسمح بأكثر من واحد pending لنفس المنقول */
const MOVABLE_EXCLUSIVE_SUBTYPE_GROUPS: string[][] = [
    ['movable_auction_date', 'movable_expert_objection'],
    ['movable_final_award', 'movable_reauction_default'],
];

const MOVABLE_SUBTYPE_LABEL_AR: Record<string, string> = {
    movable_auction_date: 'تحديد موعد مزايدة',
    movable_expert_objection: 'اعتراض على التقدير',
    movable_final_award: 'إحالة قطعية',
    movable_reauction_default: 'إعادة المزايدة للنكول',
};

/** يُرجع subtype معلّقاً يتعارض مع الطلب المراد إرساله */
export function findConflictingPendingMovableSubtype(
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    subtypeToSubmit: string
): string | null {
    const st = String(subtypeToSubmit || '').trim();
    const group = MOVABLE_EXCLUSIVE_SUBTYPE_GROUPS.find((g) => g.includes(st));
    if (!group) return null;
    for (const other of group) {
        if (other === st) continue;
        const row = findSeizureDecisionForMovable(decisions, other, movableId, {
            pendingOnly: true,
        });
        if (row) return other;
    }
    return null;
}

export function movableConflictingSubtypeLabelAr(subtype: string): string {
    return MOVABLE_SUBTYPE_LABEL_AR[String(subtype || '').trim()] || subtype;
}

export function executorSubtypesForMovableWorkflowStep(stepIndex: number): string[] {
    switch (stepIndex) {
        case 1:
            return ['movable_expert'];
        case 2:
            return ['movable_auction_date', 'movable_expert_objection'];
        case 3:
            return ['movable_expert_committee'];
        case 6:
            return ['movable_auction_date'];
        case 7:
            return ['movable_final_award', 'movable_reauction_default'];
        default:
            return [];
    }
}

/** سحب طلبات المنفذ المعلّقة للخطوة الحالية (تراجع قبل الموافقة) */
export function withdrawPendingMovableDecisionsForStep(
    dossierId: string,
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    stepIndex: number
): number {
    const exId = String(dossierId || '').trim();
    if (!exId) return 0;
    const subtypes = executorSubtypesForMovableWorkflowStep(stepIndex);
    let count = 0;
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForMovable(decisions, subtype, movableId, {
            pendingOnly: true,
        });
        const decisionId = String(row?.id || '').trim();
        if (!decisionId) continue;
        try {
            patchExecutorDecisionRow(exId, decisionId, {
                isArchived: true,
                executorOutcome: 'withdrawn',
            } as Record<string, unknown>);
            count += 1;
        } catch {
            /* ignore */
        }
    }
    if (count > 0) {
        try {
            window.dispatchEvent(new Event(DECISIONS_RELOAD_EVENT));
        } catch {
            /* ignore */
        }
    }
    return count;
}

export type MovableWorkflowHistoryLine = { label: string; value: string };

function fmtIqdAr(n: unknown): string {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '—';
    return `${Math.trunc(v).toLocaleString('ar-IQ')} د.ع`;
}

function pushDecisionHistory(
    lines: MovableWorkflowHistoryLine[],
    decisions: Array<Record<string, unknown>>,
    movableId: string,
    subtypes: string[]
): void {
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForMovable(decisions, subtype, movableId);
        if (!row || !isDecisionResolvedApproved(row)) continue;
        const title = String(row.title || row.requestTitle || '').trim();
        const details = String(row.seizureRequestDetails || row.body || '').trim();
        if (title) lines.push({ label: 'قرار المنفذ', value: title });
        if (details) {
            const short = details.length > 280 ? `${details.slice(0, 277)}…` : details;
            lines.push({ label: 'ما تم تنفيذه', value: short });
        }
        return;
    }
}

/** تفاصيل read-only للخطوات المنتهية — للعرض عند النقر */
export function buildMovableWorkflowStepHistory(
    stepIndex: number,
    m: SeizedMovable,
    decisions: Array<Record<string, unknown>>,
    movableId: string
): MovableWorkflowHistoryLine[] {
    const lines: MovableWorkflowHistoryLine[] = [];
    const txt = (v: unknown) => String(v ?? '').trim() || '—';

    switch (stepIndex) {
        case 0:
            if (m.seizureMarkLetterNumber) {
                lines.push({ label: 'رقم كتاب الإشارة', value: txt(m.seizureMarkLetterNumber) });
            }
            if (m.seizureMarkDate) {
                lines.push({ label: 'تاريخ الإشارة', value: txt(m.seizureMarkDate) });
            }
            if (m.seizureMarkEntity) {
                lines.push({ label: 'جهة الإشارة', value: txt(m.seizureMarkEntity) });
            }
            break;
        case 1:
            pushDecisionHistory(lines, decisions, movableId, ['movable_expert']);
            if (Array.isArray(m.expertNames) && m.expertNames.length) {
                lines.push({ label: 'الخبراء', value: m.expertNames.filter(Boolean).join('، ') });
            } else if (m.experts?.expertName) {
                lines.push({ label: 'الخبير', value: txt(m.experts.expertName) });
            }
            if (m.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(m.expertReportDateYmd) });
            }
            if (m.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(m.expertEstimatedAmountIqd) });
            }
            break;
        case 2: {
            const objectionKind = String(m.lastExpertObjectionKind || '').trim();
            if (objectionKind === 'report' || objectionKind === 'experts') {
                pushDecisionHistory(lines, decisions, movableId, ['movable_expert_objection']);
                lines.push({
                    label: 'مسار الاعتراض',
                    value: objectionKind === 'experts' ? 'اعتراض على الخبراء' : 'اعتراض على التقرير',
                });
            } else {
                pushDecisionHistory(lines, decisions, movableId, ['movable_auction_date']);
                const auctionYmd = String(m.auctionDateYmd || m.auction?.auctionDateYmd || '').trim();
                if (auctionYmd) lines.push({ label: 'موعد المزايدة', value: auctionYmd });
            }
            break;
        }
        case 3:
            pushDecisionHistory(lines, decisions, movableId, ['movable_expert_committee']);
            if (m.expertCommitteeSize != null) {
                lines.push({ label: 'عدد الخبراء', value: String(m.expertCommitteeSize) });
            }
            if (Array.isArray(m.expertNames) && m.expertNames.length) {
                lines.push({ label: 'لجنة الخبراء', value: m.expertNames.filter(Boolean).join('، ') });
            }
            if (m.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(m.expertReportDateYmd) });
            }
            if (m.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(m.expertEstimatedAmountIqd) });
            }
            break;
        case 4:
            if (m.newspaperName) lines.push({ label: 'الجريدة', value: txt(m.newspaperName) });
            if (m.publicationDateYmd) {
                lines.push({ label: 'تاريخ النشر', value: txt(m.publicationDateYmd) });
            }
            break;
        case 5:
            if (m.noBiddersRecordedAtIso) {
                lines.push({ label: 'نتيجة الجلسة', value: 'لا راغب بالشراء' });
            } else if (m.initialAwardBuyerName || m.initialAwardAmountIqd != null) {
                lines.push({ label: 'نتيجة الجلسة', value: 'إحالة أولية / رسو مزاد' });
                if (m.initialAwardBuyerName) {
                    lines.push({ label: 'المشتري', value: txt(m.initialAwardBuyerName) });
                }
                if (m.initialAwardAmountIqd != null) {
                    lines.push({ label: 'مبلغ الرسو', value: fmtIqdAr(m.initialAwardAmountIqd) });
                }
                if (m.auctionDepositAmountIqd != null) {
                    lines.push({ label: 'التأمينات (10%)', value: fmtIqdAr(m.auctionDepositAmountIqd) });
                }
            }
            break;
        case 6:
            if (m.noBiddersRecordedAtIso) {
                lines.push({
                    label: 'حالة',
                    value: 'تم تسجيل «لا راغب بالشراء»',
                });
            }
            pushDecisionHistory(lines, decisions, movableId, ['movable_auction_date']);
            break;
        case 7:
            if (m.reauctionDefault?.recordedAtIso) {
                pushDecisionHistory(lines, decisions, movableId, ['movable_reauction_default']);
                lines.push({ label: 'المسار', value: 'إعادة المزايدة للنكول' });
                if (m.reauctionDefault.notes) {
                    lines.push({ label: 'ملاحظات', value: txt(m.reauctionDefault.notes) });
                }
            } else if (m.award?.recordedAtIso || m.finalAwardAmountIqd != null || m.status === 'sold') {
                pushDecisionHistory(lines, decisions, movableId, ['movable_final_award']);
                lines.push({ label: 'المسار', value: 'إحالة قطعية' });
                const buyer = String(
                    m.award?.buyerName || m.lastBidderOrBuyerName || m.initialAwardBuyerName || ''
                ).trim();
                if (buyer) lines.push({ label: 'المشتري', value: buyer });
                const amt = m.award?.awardAmountIqd ?? m.finalAwardAmountIqd ?? m.initialAwardAmountIqd;
                if (amt != null) lines.push({ label: 'مبلغ الإحالة', value: fmtIqdAr(amt) });
            }
            if (m.buyerDeliveryCompletedAtIso) {
                pushDecisionHistory(lines, decisions, movableId, ['movable_buyer_delivery']);
                lines.push({
                    label: 'التسليم للمشتري',
                    value: txt(m.buyerDeliveryCompletedAtIso).slice(0, 10),
                });
            }
            if (m.proceedsDisburseCompletedAtIso) {
                lines.push({
                    label: 'صرف الحصيلة',
                    value: txt(m.proceedsDisburseCompletedAtIso).slice(0, 10),
                });
            }
            break;
        default:
            break;
    }

    return lines;
}
