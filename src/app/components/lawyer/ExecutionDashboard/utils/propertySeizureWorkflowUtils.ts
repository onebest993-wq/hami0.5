import {
    DECISIONS_RELOAD_EVENT,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizedProperty, SeizedPropertyStatus } from '@/app/types/execution';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';

export function normalizePropertySeizureStatus(raw: string): SeizedPropertyStatus | string {
    if (raw === 'estimated') return 'valued';
    if (raw === 'auction_scheduled') return 'published';
    return raw;
}

export function parseSeizedPropertyIdFromDecision(row: Record<string, unknown>): string {
    const rawJson = String(row?.seizurePayloadJson || '').trim();
    if (!rawJson) return '';
    try {
        const v = JSON.parse(rawJson) as { seizedPropertyId?: string };
        return String(v?.seizedPropertyId ?? '').trim();
    } catch {
        return '';
    }
}

export function findSeizureDecisionForProperty(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedPropertyId: string,
    opts?: { pendingOnly?: boolean }
): Record<string, unknown> | null {
    const pid = String(seizedPropertyId || '').trim();
    const st = String(subtype || '').trim();
    if (!st) return null;
    const hits = decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (String(r?.seizureSubtype || '').trim() !== st) return false;
        if (pid) {
            const linked = parseSeizedPropertyIdFromDecision(r);
            if (linked && linked !== pid) return false;
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

export function listPendingPropertySeizureDecisions(
    decisions: Array<Record<string, unknown>>,
    seizedPropertyId: string
): Array<Record<string, unknown>> {
    const pid = String(seizedPropertyId || '').trim();
    return decisions.filter((r) => {
        if (isExecutorHubRowInactiveForGoverning(r, decisions)) return false;
        if (String(r?.requestKind || '') !== 'seizure') return false;
        if (pid) {
            const linked = parseSeizedPropertyIdFromDecision(r);
            if (linked && linked !== pid) return false;
        }
        const pending =
            String(r?.executorOutcome ?? 'pending') === 'pending' ||
            String(r?.executorOutcome ?? '') === '';
        return pending;
    });
}

/** طلب حجز عقار المبدئي يُستبدل بسجل العقار — لا يُعرض مع البطاقة بعد التسجيل */
export function isStalePropertyInitSeizureDecision(
    row: Record<string, unknown>,
    property: SeizedProperty
): boolean {
    let subtype = String(row?.seizureSubtype || '').trim();
    if (!subtype && /عقار/i.test(`${String(row?.title || '')}\n${String(row?.body || '')}`)) {
        subtype = 'property';
    }
    if (subtype !== 'property') return false;
    return Boolean(String(property?.id || '').trim());
}

/** أنواع قرارات المنفذ المرتبطة بالمرحلة الحالية فقط */
export function executorSubtypesForPropertyWorkflowStatus(
    status: string,
    property: SeizedProperty
): string[] {
    const hasMark = Boolean(String(property.seizureMarkLetterNumber || '').trim());
    const norm = normalizePropertySeizureStatus(status);

    if (norm === 'sold') {
        return ['property_final_award'];
    }
    if (norm === 'initial_award') {
        return ['property_final_award', 'property_reauction_default'];
    }
    if (norm === 'no_bidders') return ['property_auction'];
    if (norm === 'estimation_objected') return ['property_expert_committee'];
    if (norm === 'valued') return ['property_auction', 'property_expert_objection'];
    if (norm === 'published') return [];
    if (norm === 'seized') return hasMark ? ['property_expert'] : [];
    return [];
}

/** قرار موافق عليه ولم يُحفظ بعد في سجل العقار */
export function findApprovedUnsavedPropertyDecision(
    decisions: Array<Record<string, unknown>>,
    subtype: string,
    seizedPropertyId: string
): Record<string, unknown> | null {
    const row = findSeizureDecisionForProperty(decisions, subtype, seizedPropertyId);
    if (!row || !isDecisionResolvedApproved(row, decisions)) return null;
    if (String(row.seizureRequestSavedAt || '').trim()) return null;
    if (!isExecutorRowApprovedWorkflowActive(row, decisions)) return null;
    return row;
}

/** مجموعات طلبات متعارضة — لا يُسمح بأكثر من واحد pending لنفس العقار */
const PROPERTY_EXCLUSIVE_SUBTYPE_GROUPS: string[][] = [
    ['property_auction', 'property_expert_objection'],
    ['property_final_award', 'property_reauction_default'],
];

const PROPERTY_SUBTYPE_LABEL_AR: Record<string, string> = {
    property_auction: 'تحديد موعد مزايدة',
    property_expert_objection: 'اعتراض على التقدير',
    property_final_award: 'إحالة قطعية',
    property_reauction_default: 'إعادة المزايدة للنكول',
};

/** يُرجع subtype معلّقاً يتعارض مع الطلب المراد إرساله */
export function findConflictingPendingPropertySubtype(
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    subtypeToSubmit: string
): string | null {
    const st = String(subtypeToSubmit || '').trim();
    const group = PROPERTY_EXCLUSIVE_SUBTYPE_GROUPS.find((g) => g.includes(st));
    if (!group) return null;
    for (const other of group) {
        if (other === st) continue;
        const row = findSeizureDecisionForProperty(decisions, other, propertyId, {
            pendingOnly: true,
        });
        if (row) return other;
    }
    return null;
}

export function propertyConflictingSubtypeLabelAr(subtype: string): string {
    return PROPERTY_SUBTYPE_LABEL_AR[String(subtype || '').trim()] || subtype;
}

/** سحب طلبات المنفذ المعلّقة للخطوة الحالية (تراجع قبل الموافقة) */
export function withdrawPendingPropertyDecisionsForStep(
    dossierId: string,
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    stepIndex: number
): number {
    const exId = String(dossierId || '').trim();
    if (!exId) return 0;
    const subtypes = executorSubtypesForPropertyWorkflowStep(stepIndex);
    let count = 0;
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForProperty(decisions, subtype, propertyId, {
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

export type PropertyWorkflowHistoryLine = { label: string; value: string };

function fmtIqdAr(n: unknown): string {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '—';
    return `${Math.trunc(v).toLocaleString('ar-IQ')} د.ع`;
}

function pushDecisionHistory(
    lines: PropertyWorkflowHistoryLine[],
    decisions: Array<Record<string, unknown>>,
    propertyId: string,
    subtypes: string[]
): void {
    for (const subtype of subtypes) {
        const row = findSeizureDecisionForProperty(decisions, subtype, propertyId);
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
export function buildPropertyWorkflowStepHistory(
    stepIndex: number,
    p: SeizedProperty,
    decisions: Array<Record<string, unknown>>,
    propertyId: string
): PropertyWorkflowHistoryLine[] {
    const lines: PropertyWorkflowHistoryLine[] = [];
    const txt = (v: unknown) => String(v ?? '').trim() || '—';

    switch (stepIndex) {
        case 0:
            if (p.seizureMarkLetterNumber) {
                lines.push({ label: 'رقم كتاب الإشارة', value: txt(p.seizureMarkLetterNumber) });
            }
            if (p.seizureMarkDate) {
                lines.push({ label: 'تاريخ الإشارة', value: txt(p.seizureMarkDate) });
            }
            if (p.seizureMarkEntity) {
                lines.push({ label: 'جهة الإشارة', value: txt(p.seizureMarkEntity) });
            }
            break;
        case 1:
            pushDecisionHistory(lines, decisions, propertyId, ['property_expert']);
            if (Array.isArray(p.expertNames) && p.expertNames.length) {
                lines.push({ label: 'الخبراء', value: p.expertNames.filter(Boolean).join('، ') });
            } else if (p.experts?.expertName) {
                lines.push({ label: 'الخبير', value: txt(p.experts.expertName) });
            }
            if (p.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(p.expertReportDateYmd) });
            }
            if (p.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(p.expertEstimatedAmountIqd) });
            } else if (p.estimatedPriceIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(p.estimatedPriceIqd) });
            }
            break;
        case 2: {
            const objectionKind = String(p.lastExpertObjectionKind || '').trim();
            if (objectionKind === 'report' || objectionKind === 'experts') {
                pushDecisionHistory(lines, decisions, propertyId, ['property_expert_objection']);
                lines.push({
                    label: 'مسار الاعتراض',
                    value: objectionKind === 'experts' ? 'اعتراض على الخبراء' : 'اعتراض على التقرير',
                });
            } else {
                pushDecisionHistory(lines, decisions, propertyId, ['property_auction']);
                const auctionYmd = String(p.auctionDateYmd || p.auction?.auctionDateYmd || '').trim();
                if (auctionYmd) lines.push({ label: 'موعد المزايدة', value: auctionYmd });
            }
            break;
        }
        case 3:
            pushDecisionHistory(lines, decisions, propertyId, ['property_expert_committee']);
            if (p.expertCommitteeSize != null) {
                lines.push({ label: 'عدد الخبراء', value: String(p.expertCommitteeSize) });
            }
            if (Array.isArray(p.expertNames) && p.expertNames.length) {
                lines.push({ label: 'لجنة الخبراء', value: p.expertNames.filter(Boolean).join('، ') });
            }
            if (p.expertReportDateYmd) {
                lines.push({ label: 'تاريخ التقرير', value: txt(p.expertReportDateYmd) });
            }
            if (p.expertEstimatedAmountIqd != null) {
                lines.push({ label: 'مبلغ التقدير', value: fmtIqdAr(p.expertEstimatedAmountIqd) });
            }
            break;
        case 4:
            if (p.newspaperName) lines.push({ label: 'الجريدة', value: txt(p.newspaperName) });
            if (p.publicationDateYmd) {
                lines.push({ label: 'تاريخ النشر', value: txt(p.publicationDateYmd) });
            }
            break;
        case 5:
            if (p.noBiddersRecordedAtIso) {
                lines.push({ label: 'نتيجة الجلسة', value: 'لا راغب بالشراء' });
            } else if (p.initialAwardBuyerName || p.initialAwardAmountIqd != null) {
                lines.push({ label: 'نتيجة الجلسة', value: 'إحالة أولية / رسو مزاد' });
                if (p.initialAwardBuyerName) {
                    lines.push({ label: 'المشتري', value: txt(p.initialAwardBuyerName) });
                }
                if (p.initialAwardAmountIqd != null) {
                    lines.push({ label: 'مبلغ الرسو', value: fmtIqdAr(p.initialAwardAmountIqd) });
                }
                if (p.auctionDepositAmountIqd != null) {
                    lines.push({ label: 'التأمينات (10%)', value: fmtIqdAr(p.auctionDepositAmountIqd) });
                }
            }
            break;
        case 6:
            if (p.noBiddersRecordedAtIso) {
                lines.push({
                    label: 'حالة',
                    value: 'تم تسجيل «لا راغب بالشراء»',
                });
            }
            pushDecisionHistory(lines, decisions, propertyId, ['property_auction']);
            break;
        case 7:
            if (p.reauctionDefault?.recordedAtIso) {
                pushDecisionHistory(lines, decisions, propertyId, ['property_reauction_default']);
                lines.push({ label: 'المسار', value: 'إعادة المزايدة للنكول' });
                if (p.reauctionDefault.notes) {
                    lines.push({ label: 'ملاحظات', value: txt(p.reauctionDefault.notes) });
                }
            } else if (p.award?.recordedAtIso || p.finalAwardAmountIqd != null || p.status === 'sold') {
                pushDecisionHistory(lines, decisions, propertyId, ['property_final_award']);
                lines.push({ label: 'المسار', value: 'إحالة قطعية' });
                const buyer = String(
                    p.award?.buyerName || p.lastBidderOrBuyerName || p.initialAwardBuyerName || ''
                ).trim();
                if (buyer) lines.push({ label: 'المشتري', value: buyer });
                const amt = p.award?.awardAmountIqd ?? p.finalAwardAmountIqd ?? p.initialAwardAmountIqd;
                if (amt != null) lines.push({ label: 'مبلغ الإحالة', value: fmtIqdAr(amt) });
            }
            if (p.titleTransferCompletedAtIso) {
                pushDecisionHistory(lines, decisions, propertyId, ['property_title_transfer']);
                lines.push({
                    label: 'نقل الملكية',
                    value: txt(p.titleTransferCompletedAtIso).slice(0, 10),
                });
            }
            if (p.buyerDeliveryCompletedAtIso) {
                pushDecisionHistory(lines, decisions, propertyId, ['property_buyer_delivery']);
                lines.push({
                    label: 'التسليم للمشتري',
                    value: txt(p.buyerDeliveryCompletedAtIso).slice(0, 10),
                });
            }
            if (p.proceedsDisburseCompletedAtIso) {
                lines.push({
                    label: 'صرف الحصيلة',
                    value: txt(p.proceedsDisburseCompletedAtIso).slice(0, 10),
                });
            }
            break;
        default:
            break;
    }

    return lines;
}

export function filterRelevantPendingPropertyDecisions(
    decisions: Array<Record<string, unknown>>,
    property: SeizedProperty,
    status: string
): Array<Record<string, unknown>> {
    const pid = String(property.id || '').trim();
    const allowed = new Set(executorSubtypesForPropertyWorkflowStatus(status, property));
    return listPendingPropertySeizureDecisions(decisions, pid).filter((row) => {
        if (isStalePropertyInitSeizureDecision(row, property)) return false;
        const st = String(row?.seizureSubtype || '').trim();
        if (!st) return false;
        return allowed.has(st);
    });
}

export function propertySeizureRequestBody(p: SeizedProperty, lead: string): string {
    return [
        lead,
        `رقم العقار: ${String(p.propertyNumber || '').trim()}`,
        `المقاطعة: ${String(p.district || '').trim()}`,
        `الجنس: ${String(p.propertyGender || '').trim()}`,
    ]
        .filter(Boolean)
        .join('\n');
}

export function propertyWorkflowActiveStepIndex(
    status: string,
    p: SeizedProperty
): number {
    const norm = normalizePropertySeizureStatus(status);
    if (norm === 'sold') return 7;
    if (norm === 'initial_award') return 7;
    if (norm === 'no_bidders') return 6;
    if (norm === 'published') {
        const needsPub =
            !String(p.newspaperName || '').trim() || !String(p.publicationDateYmd || '').trim();
        return needsPub ? 4 : 5;
    }
    if (norm === 'estimation_objected') return 3;
    if (norm === 'valued') return 2;
    if (norm === 'seized') {
        return String(p.seizureMarkLetterNumber || '').trim() ? 1 : 0;
    }
    return 0;
}

/** قرارات المنفذ المرتبطة بخطوة محددة في المسار */
export function executorSubtypesForPropertyWorkflowStep(stepIndex: number): string[] {
    switch (stepIndex) {
        case 1:
            return ['property_expert'];
        case 2:
            return ['property_auction', 'property_expert_objection'];
        case 3:
            return ['property_expert_committee'];
        case 6:
            return ['property_auction'];
        case 7:
            return ['property_final_award', 'property_reauction_default'];
        default:
            return [];
    }
}

export function stepStatusForIndex(
    idx: number,
    activeIdx: number
): 'done' | 'active' | 'locked' {
    if (idx < activeIdx) return 'done';
    if (idx === activeIdx) return 'active';
    return 'locked';
}

export function isDecisionPending(row: Record<string, unknown> | null): boolean {
    if (!row) return false;
    return (
        String(row?.executorOutcome ?? 'pending') === 'pending' ||
        String(row?.executorOutcome ?? '') === ''
    );
}

export function isDecisionResolvedApproved(
    row: Record<string, unknown> | null,
    allDecisions?: Record<string, unknown>[]
): boolean {
    if (!row) return false;
    if (isExecutorRowRejectedAndFinal(row as any)) return false;
    if (Array.isArray(allDecisions) && allDecisions.length > 0) {
        return isExecutorRowApprovedWorkflowActive(row, allDecisions);
    }
    return isExecutorRowEffectivelyApproved(row as any);
}
