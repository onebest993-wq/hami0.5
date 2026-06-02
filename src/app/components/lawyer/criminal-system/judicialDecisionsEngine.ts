import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    JudicialAppellantType,
    JudicialCassationAppealPath,
    JudicialCassationStatus,
    JudicialDecision,
    JudicialDecisionAppeal,
    JudicialDecisionDisposition,
    JudicialDecisionKind,
} from '@/app/types/criminal';
import { buildCassationHistoricalBadge, formatCassationResultShortLabel, normalizeCassationAppealResult } from './cassationJudicialForm';
import {
    canComplainantLawyerFileCassationAppeal,
    isComplainantLawyerRole,
    type CassationAppealAudienceContext,
    type CriminalCaseUserRole,
} from './complainantCassationGovernance';
import type { DefendantStatus } from './criminalStore';
import {
    BAIL_RELEASE_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    isAssetSeizureTemplate,
    isDecisionCassationAppealable,
    isDetentionDecisionTemplate,
    normalizeProceduralRequestTemplate,
} from './proceduralRequestTypes';
import { normalizeOrderEnforcementTracking } from './orderEnforcementEngine';
import { parseEventDateKey } from './stageJourney';

export type { CassationAppealAudienceContext, CriminalCaseUserRole } from './complainantCassationGovernance';
export { resolveCriminalCaseUserRole } from './complainantCassationGovernance';

export type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';

const DISPOSITIVE_KEYWORDS =
    /إفراج|براءة|إدانة|عقوبة|حكم|توحيد|تفريق|غلق|انقضاء|سقوط|تنازل|صلح|إيقاف تنفيذ|إعدام/i;
const DEFENDANT_FAVOR_KEYWORDS = /إفراج|براءة|إخلاء سبيل|كفالة|إيقاف|تنازل|صلح/i;
const COMPLAINANT_FAVOR_KEYWORDS = /إدانة|إعدام|توقيف|حبس|مصادرة/i;

export function inferJudicialDecisionKind(title: string, summary: string): JudicialDecisionKind {
    const text = `${title} ${summary}`;
    return DISPOSITIVE_KEYWORDS.test(text) ? 'dispositive' : 'preparatory';
}

export function inferJudicialDisposition(
    title: string,
    summary: string,
    beneficiaryPartyIds?: string[],
    appellantHint?: JudicialAppellantType,
): JudicialDecisionDisposition {
    const text = `${title} ${summary}`;
    if (DEFENDANT_FAVOR_KEYWORDS.test(text) && !COMPLAINANT_FAVOR_KEYWORDS.test(text)) {
        return 'favors_defendant';
    }
    if (COMPLAINANT_FAVOR_KEYWORDS.test(text) && !DEFENDANT_FAVOR_KEYWORDS.test(text)) {
        return 'favors_complainant';
    }
    if (appellantHint === 'defendant') return 'favors_defendant';
    if (appellantHint === 'complainant') return 'favors_complainant';
    if (Array.isArray(beneficiaryPartyIds) && beneficiaryPartyIds.length) return 'neutral';
    return 'neutral';
}

/** قرار حاسم لصالح المتهم بنسبة 100% — يحجب طعن المتهم (يبقى طعن المشتكي/الادعاء). */
export function isDecisionFullyFavorableToDefendants(decision: JudicialDecision): boolean {
    if (decision.decisionType !== 'dispositive') return false;
    if (decision.disposition !== 'favors_defendant') return false;
    const text = `${decision.title} ${decision.summary}`;
    return DEFENDANT_FAVOR_KEYWORDS.test(text);
}

export function canFileDefendantCassationAppeal(decision: JudicialDecision): boolean {
    if (isDecisionFullyFavorableToDefendants(decision)) return false;
    return true;
}

export function canFileComplainantCassationAppeal(decision: JudicialDecision): boolean {
    return canComplainantLawyerFileCassationAppeal(decision);
}

export function canOpenCassationAppealModal(decision: JudicialDecision): boolean {
    if (!isDecisionCassationAppealable(decision)) {
        return false;
    }
    if (decision.decisionType === 'dispositive') {
        return true;
    }
    return canFileDefendantCassationAppeal(decision) || canFileComplainantCassationAppeal(decision);
}

export function resolveDecisionScopedDefendantPartyIds(
    decision: JudicialDecision | null | undefined,
): string[] | null {
    if (!decision) return null;
    const fromDef = (Array.isArray(decision.defendantIds) ? decision.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromDef.length) return fromDef;
    const fromBeneficiary = (Array.isArray(decision.beneficiaryPartyIds) ? decision.beneficiaryPartyIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (fromBeneficiary.length) return fromBeneficiary;
    return null;
}

/** يقيّد قائمة المتهمين في مودال الطعن لمن شملهم القرار فقط — أو الجميع إن كان قراراً عاماً. */
export function filterDefendantPartiesForDecision<
    T extends { id: string; source: 'defendant' | 'complainant' },
>(parties: T[], decision: JudicialDecision | null | undefined): T[] {
    const defendants = parties.filter((p) => p.source === 'defendant');
    const scope = resolveDecisionScopedDefendantPartyIds(decision);
    if (!scope) return defendants;
    const allowed = new Set(scope);
    return defendants.filter((p) => allowed.has(p.id));
}

export function resolveAutoAppellantSideForDecision(
    decision: JudicialDecision | null | undefined,
): JudicialAppellantType | null {
    if (!decision) return null;
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (isDetentionDecisionTemplate(template)) return 'defendant';
    if (isAssetSeizureTemplate(template)) return 'defendant';
    /**
     * ⚖️ إخلاء السبيل / الكفالة: الطاعن المُتوقَّع هو «المشتكي» (يَطعن في الإفراج).
     *    نَتوقَّعه كاقتراح ذكي — مع إبقاء حقّ المحامي في تَغيير الصفة (مثلاً عند طعن
     *    الادعاء العام أو حين يُريد الدفاع رفع طعن مضاد).
     */
    if (template === BAIL_RELEASE_TEMPLATE) return 'complainant';
    return null;
}

/**
 * 🎯 (Smart Pre-fill) — الطاعن المرشَّح تلقائياً ضمن الجانب المُحدَّد:
 *   • قرار توقيف ⇒ المتهم/المتهمون المشمولون بالقرار (decision.defendantIds).
 *   • قرار إخلاء السبيل / تكفيل ⇒ المشتكي (المشتكون كلهم بشكل تَلقائي).
 *   • سواه ⇒ بدون اقتراح (يَختار المحامي يدوياً).
 */
export function resolveAutoAppellantPartyIds(
    decision: JudicialDecision | null | undefined,
    appellantSide: JudicialAppellantType,
    parties: { id: string; source: 'defendant' | 'complainant' }[],
): string[] {
    if (!decision) return [];
    const template = normalizeProceduralRequestTemplate(decision.proceduralTemplate ?? decision.title);
    if (appellantSide === 'defendant' && isDetentionDecisionTemplate(template)) {
        const detained = (decision.defendantIds ?? []).filter((id) =>
            parties.some((p) => p.source === 'defendant' && p.id === id),
        );
        return detained;
    }
    if (appellantSide === 'complainant' && template === BAIL_RELEASE_TEMPLATE) {
        return parties.filter((p) => p.source === 'complainant').map((p) => p.id);
    }
    return [];
}

/** طعن تمييزي عادي مُسجَّل مسبقاً على هذا القرار. */
export function decisionAlreadyHasCassationAppeal(decision: JudicialDecision): boolean {
    return hasJudicialAppealBeenFiledOnPath(decision, 'ordinary');
}

export function hasJudicialAppealBeenFiledOnPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): boolean {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).some((a) => {
        if (normalizeJudicialAppealPath(a.appealPath) !== path) return false;
        return String(a.filedAt ?? '').trim().length > 0;
    });
}

export function normalizeJudicialAppealPath(raw: unknown): JudicialCassationAppealPath {
    const v = String(raw ?? '').trim();
    if (v === 'intervention_264b' || v === 'correction_266') return v;
    return 'ordinary';
}

export function formatJudicialAppealPathLabel(path: JudicialCassationAppealPath | undefined): string {
    if (path === 'intervention_264b') return 'طلب تدخل تمييزي (م 264-ب)';
    if (path === 'correction_266') return 'طلب تصحيح قرار تمييزي (م 266)';
    return 'طعن تمييزي';
}

export function formatJudicialAppealAppellantLabel(
    appeal: JudicialDecisionAppeal,
    partyLabel: (id: string) => string,
): string {
    const manual = String(appeal.appellantManualLabel ?? '').trim();
    if (manual) return manual;
    const ids = (Array.isArray(appeal.appellantIds) ? appeal.appellantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const names = ids.map(partyLabel).filter((n) => n && n !== '—');
    return names.length ? names.join('، ') : '—';
}

export function decisionHasActiveAppealOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): boolean {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).some((a) => {
        if (normalizeJudicialAppealPath(a.appealPath) !== path) return false;
        if (isCassationAppealResultFinalized(a)) return false;
        if (a.cassationStatus === 'concluded') return false;
        return String(a.filedAt ?? '').trim().length > 0;
    });
}

/** زر الطعن التمييزي — يُخفى بعد تسجيل طعن على نفس القرار (لا تكرار). */
export function canShowCassationAppealFileButton(
    decision?: JudicialDecision,
    _context?: CassationAppealAudienceContext,
): boolean {
    if (!decision) return false;
    return !decisionAlreadyHasCassationAppeal(decision);
}

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

function cassationAppealStateRank(appeal: JudicialDecisionAppeal): number {
    const hasResult = Boolean(
        normalizeCassationAppealResult(typeof appeal.result === 'string' ? appeal.result : undefined),
    );
    if (appeal.cassationStatus === 'concluded' && hasResult) return 3;
    if (String(appeal.filedAt ?? '').trim()) return 2;
    return 1;
}

/** دمج طعون القرار — يفضّل النسخة المختومة بنتيجة على النسخة المعلّقة. */
export function mergeJudicialDecisionAppeals(
    primary: JudicialDecisionAppeal[] | undefined,
    secondary: JudicialDecisionAppeal[] | undefined,
): JudicialDecisionAppeal[] {
    const map = new Map<string, JudicialDecisionAppeal>();
    for (const appeal of [...(Array.isArray(primary) ? primary : []), ...(Array.isArray(secondary) ? secondary : [])]) {
        const id = String(appeal.id ?? '').trim();
        if (!id) continue;
        const prev = map.get(id);
        if (!prev || cassationAppealStateRank(appeal) >= cassationAppealStateRank(prev)) {
            map.set(id, appeal);
        }
    }
    return [...map.values()];
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

export function isCassationAppealResultFinalized(appeal: JudicialDecisionAppeal): boolean {
    if (appeal.cassationStatus !== 'concluded') return false;
    return Boolean(
        normalizeCassationAppealResult(typeof appeal.result === 'string' ? appeal.result : undefined),
    );
}

export function isJudicialDecisionCassationConcluded(decision: JudicialDecision): boolean {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).some(isCassationAppealResultFinalized);
}

/** طعن واحد معلّق يمكن تسجيل نتيجته — يدعم تعدد المسارات (عادي + تدخل + تصحيح). */
export function getPendingCassationAppealForResult(
    decision: JudicialDecision,
): JudicialDecisionAppeal | undefined {
    const appeals = Array.isArray(decision.appeals) ? decision.appeals : [];
    const pathPriority: JudicialCassationAppealPath[] = [
        'intervention_264b',
        'correction_266',
        'ordinary',
    ];
    for (const path of pathPriority) {
        const hit = appeals.find((a) => isPendingJudicialAppealForResult(a, path));
        if (hit) return hit;
    }
    return undefined;
}

export function getJudicialDecisionAppealsOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): JudicialDecisionAppeal[] {
    return (Array.isArray(decision.appeals) ? decision.appeals : []).filter(
        (a) => normalizeJudicialAppealPath(a.appealPath) === path,
    );
}

export function isPendingJudicialAppealForResult(
    appeal: JudicialDecisionAppeal,
    path?: JudicialCassationAppealPath,
): boolean {
    if (path && normalizeJudicialAppealPath(appeal.appealPath) !== path) return false;
    if (isCassationAppealResultFinalized(appeal)) return false;
    if (appeal.cassationStatus === 'concluded') return false;
    const hasResult = Boolean(
        normalizeCassationAppealResult(typeof appeal.result === 'string' ? appeal.result : undefined),
    );
    if (hasResult) return false;
    return appeal.cassationStatus === 'pending' || appeal.cassationStatus === 'under_review';
}

export function getLatestJudicialAppealOfPath(
    decision: JudicialDecision,
    path: JudicialCassationAppealPath,
): JudicialDecisionAppeal | undefined {
    const list = getJudicialDecisionAppealsOfPath(decision, path);
    return list.length ? list[list.length - 1] : undefined;
}

export function resolveJudicialInterventionAppealStatusLabel(
    appeal: JudicialDecisionAppeal | undefined,
): string {
    if (!appeal) return 'قيد النظر — بانتظار النتيجة';
    if (isCassationAppealResultFinalized(appeal)) {
        const resultLabel = formatCassationResultShortLabel(
            typeof appeal.result === 'string' ? appeal.result : '',
        );
        return resultLabel ? `منتهٍ — ${resultLabel}` : 'منتهٍ — نتيجة مسجّلة';
    }
    if (isPendingJudicialAppealForResult(appeal)) {
        return 'قيد التدقيق التمييزي — بانتظار النتيجة';
    }
    return 'قيد النظر — بانتظار النتيجة';
}

export function canRecordCassationAppealResult(decision: JudicialDecision): boolean {
    return Boolean(getPendingCassationAppealForResult(decision));
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

/** طعن تمييزي مُسجَّل فعلياً عبر مسار «طعن تمييزي» ثم اختُتمت نتيجته — لا يُستمد من هامش رفض ابتدائي. */
export function isRecordedCassationAppealConcluded(appeal: JudicialDecisionAppeal): boolean {
    if (!isCassationAppealResultFinalized(appeal)) return false;
    return Boolean(String(appeal.filedAt ?? '').trim());
}

export function filterRecordedCassationAppeals(appeals: JudicialDecisionAppeal[] | undefined): JudicialDecisionAppeal[] {
    return (Array.isArray(appeals) ? appeals : []).filter(isRecordedCassationAppealConcluded);
}

export function formatRectificationBadge(
    appeal: JudicialDecisionAppeal,
    partyLabelById: (id: string) => string,
    decisionTitle?: string,
): string | null {
    if (!isRecordedCassationAppealConcluded(appeal)) return null;
    return buildCassationHistoricalBadge(appeal, partyLabelById, decisionTitle);
}

export function latestConcludedAppealWithBeneficiary(decision: JudicialDecision): JudicialDecisionAppeal | null {
    const concluded = filterRecordedCassationAppeals(decision.appeals);
    return concluded.length ? concluded[concluded.length - 1]! : null;
}

/** عرض تاريخ السجل بصيغة ISO ثابتة دون انقلاب بصري في الواجهة العربية. */
export function formatJudicialLedgerDate(iso: string | undefined): string {
    const raw = String(iso ?? '').trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return raw || '—';
}

export type LawyerRequestLike = {
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

export function lawyerRequestQualifiesForLedger(req: LawyerRequestLike): boolean {
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
