import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    JudicialCassationStatus,
    JudicialDecision,
    JudicialDecisionAppeal,
} from '@/app/types/criminal';
import { normalizeCassationAppealResult } from './cassationJudicialForm';
import type { DefendantStatus } from './criminalCaseModel';
import {
    BAIL_RELEASE_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { parseEventDateKey } from './stageJourney';
import {
    mergeJudicialDecisionAppeals,
    normalizeJudicialAppealPath,
} from './judicialDecisionCassationHelpers';
import { inferJudicialDecisionKind, inferJudicialDisposition } from './judicialDecisionEligibility';

/** مطابقة مرنة بين معرّف الواجهة (jd_*) ومعرّف التخزين (sourceRequestId). */
export function findJudicialDecisionByRef(
    decisions: JudicialDecision[],
    decisionRef: string,
): JudicialDecision | undefined {
    const did = String(decisionRef ?? '').trim();
    if (!did) return undefined;
    return decisions.find(
        (d) =>
            d.id === did ||
            d.sourceRequestId === did ||
            (d.sourceRequestId ? `jd_${d.sourceRequestId}` === did : false),
    );
}

export function findJudicialDecisionStoreIndex(
    stored: JudicialDecision[],
    merged: JudicialDecision,
): number {
    const persistKey = merged.sourceRequestId ?? merged.id;
    return stored.findIndex(
        (d) =>
            (d.sourceRequestId ?? d.id) === persistKey ||
            d.id === merged.id ||
            (merged.sourceRequestId ? `jd_${merged.sourceRequestId}` === d.id : false),
    );
}

export function judicialDecisionPersistKey(decision: JudicialDecision): string {
    const sourceRequestId = String(decision.sourceRequestId ?? '').trim();
    if (sourceRequestId) return sourceRequestId;
    const id = String(decision.id ?? '').trim();
    if (id.startsWith('jd_')) return id.slice(3);
    return id;
}

export function coalesceJudicialDecisions(list: JudicialDecision[]): JudicialDecision[] {
    const map = new Map<string, JudicialDecision>();
    for (const raw of list) {
        const key = judicialDecisionPersistKey(raw);
        const existing = map.get(key);
        if (!existing) {
            map.set(key, raw);
            continue;
        }
        map.set(key, {
            ...existing,
            ...raw,
            id: existing.id.startsWith('jd_') ? existing.id : raw.id.startsWith('jd_') ? raw.id : existing.id,
            appeals: mergeJudicialDecisionAppeals(existing.appeals, raw.appeals),
            isLocked: existing.isLocked || raw.isLocked,
            requestOutcomeStatus: raw.requestOutcomeStatus ?? existing.requestOutcomeStatus,
        });
    }
    return sortJudicialDecisionsChronologically([...map.values()]);
}

export function sortJudicialDecisionsChronologically(list: JudicialDecision[]): JudicialDecision[] {
    return [...list].sort((a, b) => parseEventDateKey(a.issuedAt) - parseEventDateKey(b.issuedAt));
}

/** عرض السجل — الأحدث أولاً (للواجهة فقط). */
export function sortJudicialDecisionsNewestFirst(list: JudicialDecision[]): JudicialDecision[] {
    return [...list].sort((a, b) => parseEventDateKey(b.issuedAt) - parseEventDateKey(a.issuedAt));
}

/** حالة المتهم المعروضة — تُستمد من القرارات القضائية المقفولة ثم القيمة المخزنة. */
export function resolveDefendantStatusFromJudicialDecisions(
    defendantId: string,
    decisions: JudicialDecision[],
    storedStatus: DefendantStatus | '',
): DefendantStatus | '' {
    const id = String(defendantId ?? '').trim();
    if (!id) return storedStatus;
    const sorted = sortJudicialDecisionsChronologically(decisions);
    let status: DefendantStatus | '' = storedStatus;
    for (const decision of sorted) {
        if (decision.isLocked !== true) continue;
        const ids = (Array.isArray(decision.defendantIds) ? decision.defendantIds : [])
            .map((x) => String(x ?? '').trim())
            .filter(Boolean);
        if (!ids.includes(id)) continue;
        const typeKey = normalizeProceduralRequestTemplate(
            String(decision.requestType ?? decision.title ?? ''),
        );
        const blob = `${typeKey} ${String(decision.summary ?? '')}`;
        if (
            typeKey === DETENTION_DECISION_TEMPLATE ||
            /توقيف|ملقى القبض|قبض عليه/i.test(blob)
        ) {
            status = 'موقوف';
            continue;
        }
        if (typeKey === BAIL_RELEASE_TEMPLATE || /إخلاء سبيل|كفالة|بتعهد/i.test(blob)) {
            status = 'مكفل';
            continue;
        }
        if (/إطلاق سراح|إفراج|documentDetentionRelease/i.test(blob)) {
            status = 'حر';
        }
    }
    return status;
}

/** عرض تاريخ السجل بصيغة ISO ثابتة دون انقلاب بصري في الواجهة العربية. */
export function formatJudicialLedgerDate(iso: string | undefined): string {
    const raw = String(iso ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return raw || '—';
}

type LawyerRequestLike = {
    id: string;
    requestDate: string;
    type: string;
    lawyerNote: string;
    status: string;
    judgeMargin?: string;
    decisionDate?: string;
    defendantIds?: string[];
    isLocked?: boolean;
    proceduralNodeId?: string;
    proceduralTemplate?: string;
    isAppealable?: boolean;
    detentionStartDate?: string;
    detentionEndDate?: string;
    legalArticleBasis?: string;
    orderEnforcement?: import('@/app/types/criminal').OrderEnforcementTracking;
    referredCourtName?: string;
    defendantBail?: {
        kind?: 'financial' | 'personal' | string;
        bailAmount?: string;
        guarantors?: Array<{ id?: string; fullName?: string }>;
    };
};

function lawyerRequestQualifiesForLedger(req: LawyerRequestLike): boolean {
    if (req.status === 'executed') return true;
    if (req.isLocked) return true;
    if (req.status === 'approved' || req.status === 'rejected') {
        return Boolean(String(req.judgeMargin ?? '').trim() || String(req.decisionDate ?? '').trim());
    }
    return false;
}

function normalizeJudicialDecisionBail(raw: unknown): JudicialDecision['defendantBail'] | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const b = raw as Record<string, unknown>;
    const kind = b.kind === 'financial' || b.kind === 'personal' ? b.kind : undefined;
    const bailAmount =
        typeof b.bailAmount === 'string' && b.bailAmount.trim() ? b.bailAmount.trim() : undefined;
    const guarantors = Array.isArray(b.guarantors)
        ? b.guarantors
              .map((g) => {
                  if (!g || typeof g !== 'object') return null;
                  const row = g as Record<string, unknown>;
                  const fullName =
                      typeof row.fullName === 'string' && row.fullName.trim()
                          ? row.fullName.trim()
                          : '';
                  if (!fullName) return null;
                  return {
                      id: typeof row.id === 'string' ? row.id : undefined,
                      fullName,
                  };
              })
              .filter((x): x is { id?: string; fullName: string } => x !== null)
        : undefined;
    if (kind === 'financial' && bailAmount) return { kind, bailAmount };
    if (kind === 'personal' && guarantors?.length) return { kind, guarantors };
    if (bailAmount) return { kind: 'financial', bailAmount };
    return undefined;
}

export function lawyerRequestToJudicialDecision(req: LawyerRequestLike): JudicialDecision | null {
    if (!lawyerRequestQualifiesForLedger(req)) return null;
    const title = normalizeProceduralRequestTemplate(String(req.type ?? '').trim()) || 'قرار قضائي';
    const summary = String(req.judgeMargin ?? '').trim() || String(req.lawyerNote ?? '').trim() || '—';
    const issuedAt = String(req.decisionDate ?? '').trim() || String(req.requestDate ?? '').trim();
    const beneficiaryPartyIds = Array.isArray(req.defendantIds)
        ? req.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
        : undefined;
    const requestOutcomeStatus =
        req.status === 'approved' || req.status === 'rejected' ? req.status : undefined;
    return {
        id: `jd_${req.id}`,
        issuedAt,
        title,
        summary,
        decisionType: inferJudicialDecisionKind(title, summary),
        disposition: inferJudicialDisposition(title, summary, beneficiaryPartyIds),
        beneficiaryPartyIds,
        defendantIds: beneficiaryPartyIds,
        appeals: [],
        isLocked:
            req.isLocked === true ||
            req.status === 'executed' ||
            req.status === 'approved' ||
            req.status === 'rejected',
        proceduralNodeId: req.proceduralNodeId,
        sourceRequestId: req.id,
        proceduralTemplate: normalizeProceduralRequestTemplate(req.proceduralTemplate ?? title),
        isAppealable: req.isAppealable === true ? true : undefined,
        requestOutcomeStatus,
        detentionStartDate:
            typeof req.detentionStartDate === 'string' && req.detentionStartDate.trim()
                ? req.detentionStartDate.trim()
                : undefined,
        detentionEndDate:
            typeof req.detentionEndDate === 'string' && req.detentionEndDate.trim()
                ? req.detentionEndDate.trim()
                : undefined,
        legalArticleBasis:
            typeof req.legalArticleBasis === 'string' && req.legalArticleBasis.trim()
                ? req.legalArticleBasis.trim()
                : normalizeOrderEnforcementTracking(req.orderEnforcement)?.legalArticleBasis,
        orderEnforcement: normalizeOrderEnforcementTracking(req.orderEnforcement),
        referredCourtName:
            typeof req.referredCourtName === 'string' && req.referredCourtName.trim()
                ? req.referredCourtName.trim()
                : undefined,
        defendantBail: normalizeJudicialDecisionBail(req.defendantBail),
    };
}

export function mergeJudicialDecisionsFromRequests(
    stored: JudicialDecision[] | undefined,
    requests: LawyerRequestLike[] | undefined,
): JudicialDecision[] {
    const map = new Map<string, JudicialDecision>();
    for (const d of coalesceJudicialDecisions(Array.isArray(stored) ? stored : [])) {
        map.set(judicialDecisionPersistKey(d), d);
    }
    for (const req of Array.isArray(requests) ? requests : []) {
        const converted = lawyerRequestToJudicialDecision(req);
        if (!converted) continue;
        const key = judicialDecisionPersistKey(converted);
        const existing = map.get(key);
        if (existing) {
            const merged: JudicialDecision = {
                ...converted,
                id: existing.id,
                appeals: mergeJudicialDecisionAppeals(existing.appeals, converted.appeals),
                isLocked: existing.isLocked || converted.isLocked,
                requestOutcomeStatus: converted.requestOutcomeStatus ?? existing.requestOutcomeStatus,
                orderEnforcement: existing.orderEnforcement ?? converted.orderEnforcement,
                legalArticleBasis: existing.legalArticleBasis ?? converted.legalArticleBasis,
                defendantBail: converted.defendantBail ?? existing.defendantBail,
            };
            map.set(key, preserveJudicialDecisionLifecycleFields(existing, merged));
        } else {
            map.set(key, converted);
        }
    }
    return sortJudicialDecisionsChronologically([...map.values()]);
}

/** يحافظ على حقول دورة الطعن المخزّنة ولا يُمحى بها عند دمج طلب المحامي. */
function preserveJudicialDecisionLifecycleFields(
    stored: JudicialDecision,
    merged: JudicialDecision,
): JudicialDecision {
    return {
        ...merged,
        proceduralNodeId: stored.proceduralNodeId ?? merged.proceduralNodeId,
        decisionPresenceType: stored.decisionPresenceType ?? merged.decisionPresenceType,
        decisionCaseType: stored.decisionCaseType ?? merged.decisionCaseType,
        decisionAppealability: stored.decisionAppealability ?? merged.decisionAppealability,
        isAppealed: stored.isAppealed === true ? true : merged.isAppealed,
        appealResult: stored.appealResult ?? merged.appealResult,
        isJudgmentFinalDeclared:
            stored.isJudgmentFinalDeclared === true ? true : merged.isJudgmentFinalDeclared,
        cassationPapersReceivedAt: stored.cassationPapersReceivedAt ?? merged.cassationPapersReceivedAt,
        interventionCassationPending:
            stored.interventionCassationPending === true ? true : merged.interventionCassationPending,
        cassationCorrectionPending:
            stored.cassationCorrectionPending === true ? true : merged.cassationCorrectionPending,
        judgmentFinalDeclaredAt: stored.judgmentFinalDeclaredAt ?? merged.judgmentFinalDeclaredAt,
        judgmentFinalDeclaredByLabel:
            stored.judgmentFinalDeclaredByLabel ?? merged.judgmentFinalDeclaredByLabel,
        judgmentFinalDeclaredByIds:
            stored.judgmentFinalDeclaredByIds ?? merged.judgmentFinalDeclaredByIds,
    };
}

export function normalizeJudicialDecision(raw: unknown): JudicialDecision | null {
    if (!raw || typeof raw !== 'object') return null;
    const o = raw as Record<string, unknown>;
    const id = String(o.id ?? '').trim();
    if (!id) return null;
    const decisionType = o.decisionType === 'dispositive' ? 'dispositive' : 'preparatory';
    const appealsRaw = Array.isArray(o.appeals) ? o.appeals : [];
    const appeals: JudicialDecisionAppeal[] = appealsRaw
        .map((a) => {
            if (!a || typeof a !== 'object') return null;
            const ap = a as Record<string, unknown>;
            const aid = String(ap.id ?? '').trim();
            if (!aid) return null;
            const appellantType = ap.appellantType === 'complainant' ? 'complainant' : 'defendant';
            const appellantIds = Array.isArray(ap.appellantIds)
                ? ap.appellantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
                : [];
            const statusRaw = String(ap.cassationStatus ?? 'pending').trim();
            const cassationStatus: JudicialCassationStatus | string =
                statusRaw === 'under_review' || statusRaw === 'concluded' || statusRaw === 'pending'
                    ? statusRaw
                    : statusRaw || 'pending';
            const beneficiaryIds = Array.isArray(ap.beneficiaryIds)
                ? ap.beneficiaryIds.map((x) => String(x ?? '').trim()).filter(Boolean)
                : undefined;
            const targetDefendantIds = Array.isArray(ap.targetDefendantIds)
                ? ap.targetDefendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
                : appellantIds;
            const remandRaw = String(ap.remandTargetStage ?? '').trim();
            const remandTargetStage: CassationAppealRemandTarget | undefined =
                remandRaw === 'investigation' || remandRaw === 'misdemeanor' || remandRaw === 'felony'
                    ? remandRaw
                    : undefined;
            const resultRaw = typeof ap.result === 'string' ? ap.result : undefined;
            const resultNorm = resultRaw ? normalizeCassationAppealResult(resultRaw) : undefined;
            return {
                id: aid,
                appellantType,
                appellantIds,
                targetDefendantIds,
                cassationStatus,
                result: (resultNorm || resultRaw) as CassationAppealResult | string | undefined,
                beneficiaryIds,
                filedAt: typeof ap.filedAt === 'string' ? ap.filedAt : undefined,
                isObjectiveGrounds269b: ap.isObjectiveGrounds269b === true,
                remandTargetStage,
                modifiedCharge: typeof ap.modifiedCharge === 'string' ? ap.modifiedCharge : undefined,
                modifiedArticle: typeof ap.modifiedArticle === 'string' ? ap.modifiedArticle : undefined,
                concludedAt: typeof ap.concludedAt === 'string' ? ap.concludedAt : undefined,
                cassationDirectives:
                    typeof ap.cassationDirectives === 'string' ? ap.cassationDirectives : undefined,
                appellantManualLabel:
                    typeof ap.appellantManualLabel === 'string' ? ap.appellantManualLabel.trim() || undefined : undefined,
                appealPath: normalizeJudicialAppealPath(ap.appealPath),
            };
        })
        .filter((x): x is JudicialDecisionAppeal => Boolean(x));

    const disposition =
        o.disposition === 'favors_defendant' || o.disposition === 'favors_complainant'
            ? o.disposition
            : inferJudicialDisposition(
                  String(o.title ?? ''),
                  String(o.summary ?? ''),
                  Array.isArray(o.beneficiaryPartyIds)
                      ? (o.beneficiaryPartyIds as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
                      : undefined,
              );

    return {
        id,
        issuedAt: String(o.issuedAt ?? '').trim() || new Date().toISOString().slice(0, 10),
        title: String(o.title ?? '').trim() || 'قرار قضائي',
        summary: String(o.summary ?? '').trim() || '—',
        decisionType,
        appeals,
        isLocked: o.isLocked === true,
        disposition,
        beneficiaryPartyIds: Array.isArray(o.beneficiaryPartyIds)
            ? (o.beneficiaryPartyIds as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
            : undefined,
        defendantIds: Array.isArray(o.defendantIds)
            ? (o.defendantIds as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
            : undefined,
        proceduralNodeId: typeof o.proceduralNodeId === 'string' ? o.proceduralNodeId : undefined,
        sourceRequestId: typeof o.sourceRequestId === 'string' ? o.sourceRequestId : undefined,
        proceduralTemplate: typeof o.proceduralTemplate === 'string' ? o.proceduralTemplate : undefined,
        isAppealable: o.isAppealable === true ? true : undefined,
        detentionStartDate:
            typeof o.detentionStartDate === 'string' && o.detentionStartDate.trim()
                ? o.detentionStartDate.trim()
                : undefined,
        detentionEndDate:
            typeof o.detentionEndDate === 'string' && o.detentionEndDate.trim() ? o.detentionEndDate.trim() : undefined,
        detentionReleasedAt:
            typeof o.detentionReleasedAt === 'string' && o.detentionReleasedAt.trim()
                ? o.detentionReleasedAt.trim()
                : undefined,
        defendantBail: normalizeJudicialDecisionBail(o.defendantBail),
        requestOutcomeStatus:
            o.requestOutcomeStatus === 'approved' || o.requestOutcomeStatus === 'rejected'
                ? o.requestOutcomeStatus
                : undefined,
        legalArticleBasis:
            typeof o.legalArticleBasis === 'string' && o.legalArticleBasis.trim()
                ? o.legalArticleBasis.trim()
                : undefined,
        orderEnforcement: normalizeOrderEnforcementTracking(o.orderEnforcement),
        decisionPresenceType:
            o.decisionPresenceType === 'وجاهي' || o.decisionPresenceType === 'غيابي'
                ? o.decisionPresenceType
                : undefined,
        decisionCaseType:
            o.decisionCaseType === 'جناية' || o.decisionCaseType === 'جنحة' || o.decisionCaseType === 'مخالفة'
                ? o.decisionCaseType
                : undefined,
        decisionAppealability:
            o.decisionAppealability === 'قابل للطعن على انفراد' ||
            o.decisionAppealability === 'غير قابل للطعن على انفراد' ||
            o.decisionAppealability === 'قرار تمييزي'
                ? o.decisionAppealability
                : undefined,
        isAppealed: o.isAppealed === true ? true : undefined,
        appealResult: typeof o.appealResult === 'string' && o.appealResult.trim() ? o.appealResult.trim() : undefined,
        isJudgmentFinalDeclared: o.isJudgmentFinalDeclared === true ? true : undefined,
        judgmentFinalDeclaredAt:
            typeof o.judgmentFinalDeclaredAt === 'string' && o.judgmentFinalDeclaredAt.trim()
                ? o.judgmentFinalDeclaredAt.trim()
                : undefined,
        judgmentFinalDeclaredByLabel:
            typeof o.judgmentFinalDeclaredByLabel === 'string' && o.judgmentFinalDeclaredByLabel.trim()
                ? o.judgmentFinalDeclaredByLabel.trim()
                : undefined,
        judgmentFinalDeclaredByIds: Array.isArray(o.judgmentFinalDeclaredByIds)
            ? (o.judgmentFinalDeclaredByIds as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
            : undefined,
        cassationPapersReceivedAt:
            typeof o.cassationPapersReceivedAt === 'string' && o.cassationPapersReceivedAt.trim()
                ? o.cassationPapersReceivedAt.trim()
                : undefined,
        interventionCassationPending: o.interventionCassationPending === true ? true : undefined,
        cassationCorrectionPending: o.cassationCorrectionPending === true ? true : undefined,
    };
}
