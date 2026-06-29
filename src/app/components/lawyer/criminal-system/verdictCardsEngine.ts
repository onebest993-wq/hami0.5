// @ts-nocheck
import type { CaseStage } from '@/app/types/criminal';
import {
    hasCassationCorrectionPartyInterest,
    isCassationIssuedByGeneralAssembly,
    resolveCassationCorrectionRemainingDaysForAnchor,
    type CassationCorrectionUserRole,
} from './decisionAppealPeriodEngine';
import { applyAbsentiaObjectionExpiry } from './stageFinalDecisionEngine';
import type { CriminalCase, StageConclusion } from './criminalCaseModel';
import {
    computeAppealDeadline,
    findTrialVerdictSession,
    isTrialVerdictOutcome,
    normalizeTrialSessions,
    type TrialVerdictOutcome,
} from './trialSessionsEngine';
import { resolveCurrentJourneyNodeId } from './stageJourney';
import {
    isVerdictCassationCorrectionBlockedResult,
    isVerdictCassationCorrectionEligibleResult,
    verdictCassationResultLabel,
    type VerdictCassationResultValue,
} from './verdictCassationResultEngine';

export type { VerdictCassationResultValue };
export {
    VERDICT_CASSATION_RESULT_OPTIONS,
    VERDICT_REFERRAL_COURT_OPTIONS,
} from './verdictCassationResultEngine';

export type VerdictCardOutcome = TrialVerdictOutcome;

export type VerdictOrdinaryAppealTrack = {
    cassationDossierNumber?: string;
    filedAt?: string;
    result?: string;
    courtLabel?: string;
    /** جهة إصدار القرار التمييزي — للتحقق من م 267 (الهيئة العامة). */
    issuedBy?: string;
    /** تاريخ تسجيل نتيجة/قرار التمييز — بداية مهلة التصحيح (30 يوماً). */
    resultRecordedAt?: string;
    /** المحكمة المحال إليها — نقض لعدم الاختصاص. */
    referredCourtStage?: string;
    /** توجيهات محكمة التمييز الملزمة — نقض وإعادة للمحاكمة. */
    bindingDirections?: string;
    /** منطوق تعديل العقوبة — نقض وتعديل موضوعي. */
    penaltyModificationText?: string;
};

export function formatVerdictCassationResultLabel(resultRaw: string | undefined): string {
    return verdictCassationResultLabel(resultRaw);
}

export type VerdictInterventionStatus = 'pending' | 'accepted_quashed' | 'rejected';

export type VerdictInterventionAppealTrack = {
    targetedDecisionDescription?: string;
    interventionRequestNumber?: string;
    referredToAuthority?: string;
    status?: VerdictInterventionStatus | string;
};

export type VerdictCorrectionAppealTrack = {
    targetedDecisionDescription?: string;
    correctionRequestNumber?: string;
    filedAt?: string;
    status?: VerdictInterventionStatus | string;
};

export type VerdictCard = {
    id: string;
    outcome: VerdictCardOutcome;
    issuedAt: string;
    appealDeadline: string;
    decisionDraft?: string;
    sourceConclusionId?: string;
    proceduralNodeId?: string;
    defendantIds?: string[];
    ordinaryAppeal?: VerdictOrdinaryAppealTrack;
    interventionAppeal?: VerdictInterventionAppealTrack;
    correctionAppeal?: VerdictCorrectionAppealTrack;
    /** نوع القرار الختامي — منظومة إصدار القرار الجديدة. */
    finalDecisionKind?: import('./stageFinalDecisionEngine').StageFinalDecisionKind;
    presenceType?: 'وجاهي' | 'غيابي';
    penalty?: import('./stageFinalDecisionEngine').StageFinalPenaltyBlock;
    caseCrimeType?: 'جناية' | 'جنحة' | 'مخالفة';
    absentiaPublicationDate?: string;
    absentiaObjectionDeadline?: string;
    absentiaObjectionFiled?: boolean;
    absentiaTreatedAsInPerson?: boolean;
    cassationAppealFiled?: boolean;
    /** مسار إجرائي — موجز (أمر جزائي) أو كامل. */
    decisionProcedurePath?: import('./stageFinalDecisionEngine').StageFinalDecisionProcedurePath;
};

export function isVerdictCardOutcome(v: string): v is VerdictCardOutcome {
    return isTrialVerdictOutcome(v);
}

export function verdictOutcomeLabel(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') return 'حكم بالبراءة';
    if (outcome === 'release') return 'حكم بالإفراج';
    return 'حكم بالإدانة';
}

export function verdictCardShellClass(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') {
        return 'border-emerald-500/40 bg-emerald-950/20';
    }
    if (outcome === 'release') {
        return 'border-amber-400/40 bg-amber-950/18';
    }
    return 'border-[#E6C673]/30 bg-slate-800/40';
}

export function verdictOutcomeEmoji(outcome: VerdictCardOutcome): string {
    if (outcome === 'acquittal') return '';
    if (outcome === 'release') return '';
    return '';
}

export function normalizeVerdictCards(raw: unknown): VerdictCard[] {
    if (!Array.isArray(raw)) return [];
    const out: VerdictCard[] = [];
    for (const row of raw) {
        if (!row || typeof row !== 'object') continue;
        const o = row as Partial<VerdictCard>;
        const outcome = String(o.outcome ?? '').trim();
        if (!isVerdictCardOutcome(outcome)) continue;
        const id = String(o.id ?? '').trim();
        const issuedAt = String(o.issuedAt ?? '').trim();
        if (!id || !issuedAt) continue;
        out.push({
            id,
            outcome,
            issuedAt,
            appealDeadline:
                String(o.appealDeadline ?? '').trim() || computeAppealDeadline(issuedAt),
            decisionDraft:
                typeof o.decisionDraft === 'string' && o.decisionDraft.trim()
                    ? o.decisionDraft.trim()
                    : undefined,
            sourceConclusionId:
                typeof o.sourceConclusionId === 'string' && o.sourceConclusionId.trim()
                    ? o.sourceConclusionId.trim()
                    : undefined,
            proceduralNodeId:
                typeof o.proceduralNodeId === 'string' && o.proceduralNodeId.trim()
                    ? o.proceduralNodeId.trim()
                    : undefined,
            defendantIds: Array.isArray(o.defendantIds)
                ? o.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
                : undefined,
            ordinaryAppeal: normalizeOrdinaryAppeal(o.ordinaryAppeal),
            interventionAppeal: normalizeInterventionAppeal(o.interventionAppeal),
            correctionAppeal: normalizeCorrectionAppeal(o.correctionAppeal),
            finalDecisionKind:
                o.finalDecisionKind === 'conviction_penalty' ||
                o.finalDecisionKind === 'acquittal' ||
                o.finalDecisionKind === 'release' ||
                o.finalDecisionKind === 'criminal_expiration' ||
                o.finalDecisionKind === 'settlement_waiver'
                    ? o.finalDecisionKind
                    : undefined,
            presenceType: o.presenceType === 'غيابي' ? 'غيابي' : o.presenceType === 'وجاهي' ? 'وجاهي' : undefined,
            penalty: normalizePenaltyBlock(o.penalty),
            caseCrimeType:
                o.caseCrimeType === 'جناية' || o.caseCrimeType === 'جنحة' || o.caseCrimeType === 'مخالفة'
                    ? o.caseCrimeType
                    : undefined,
            absentiaPublicationDate:
                typeof o.absentiaPublicationDate === 'string' && o.absentiaPublicationDate.trim()
                    ? o.absentiaPublicationDate.trim()
                    : undefined,
            absentiaObjectionDeadline:
                typeof o.absentiaObjectionDeadline === 'string' && o.absentiaObjectionDeadline.trim()
                    ? o.absentiaObjectionDeadline.trim()
                    : undefined,
            absentiaObjectionFiled: o.absentiaObjectionFiled === true ? true : undefined,
            absentiaTreatedAsInPerson: o.absentiaTreatedAsInPerson === true ? true : undefined,
            cassationAppealFiled: o.cassationAppealFiled === true ? true : undefined,
            decisionProcedurePath:
                o.decisionProcedurePath === 'summary' || o.decisionProcedurePath === 'full'
                    ? o.decisionProcedurePath
                    : undefined,
        });
    }
    return out;
}

function normalizePenaltyBlock(raw: unknown): import('./stageFinalDecisionEngine').StageFinalPenaltyBlock | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const masterKind = String(o.masterKind ?? '').trim();
    if (
        masterKind !== 'severe_imprisonment' &&
        masterKind !== 'simple_imprisonment' &&
        masterKind !== 'fine' &&
        masterKind !== 'combined_imprisonment_fine'
    ) {
        return undefined;
    }
    const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? n : undefined;
    };
    return {
        masterKind: masterKind as import('./stageFinalDecisionEngine').MasterPenaltyKind,
        years: num(o.years),
        months: num(o.months),
        fineAmountIqd: num(o.fineAmountIqd),
        substituteImprisonmentDays: num(o.substituteImprisonmentDays),
        substituteImprisonmentMonths: num(o.substituteImprisonmentMonths),
        suspendedExecution: o.suspendedExecution === true ? true : undefined,
        suspendedExecutionReason:
            typeof o.suspendedExecutionReason === 'string' && o.suspendedExecutionReason.trim()
                ? o.suspendedExecutionReason.trim()
                : undefined,
        penalties_supplementary: (() => {
            const fromNew =
                typeof o.penalties_supplementary === 'string' ? o.penalties_supplementary.trim() : '';
            if (fromNew) return fromNew;
            const fromLegacy = typeof o.accessory_penalties === 'string' ? o.accessory_penalties.trim() : '';
            return fromLegacy || undefined;
        })(),
    };
}

function normalizeOrdinaryAppeal(raw: unknown): VerdictOrdinaryAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictOrdinaryAppealTrack;
    const next: VerdictOrdinaryAppealTrack = {};
    if (typeof o.cassationDossierNumber === 'string' && o.cassationDossierNumber.trim()) {
        next.cassationDossierNumber = o.cassationDossierNumber.trim();
    }
    if (typeof o.filedAt === 'string' && o.filedAt.trim()) next.filedAt = o.filedAt.trim();
    if (typeof o.result === 'string' && o.result.trim()) next.result = o.result.trim();
    if (typeof o.courtLabel === 'string' && o.courtLabel.trim()) next.courtLabel = o.courtLabel.trim();
    if (typeof o.issuedBy === 'string' && o.issuedBy.trim()) next.issuedBy = o.issuedBy.trim();
    if (typeof o.resultRecordedAt === 'string' && o.resultRecordedAt.trim()) {
        next.resultRecordedAt = o.resultRecordedAt.trim();
    }
    if (typeof o.referredCourtStage === 'string' && o.referredCourtStage.trim()) {
        next.referredCourtStage = o.referredCourtStage.trim();
    }
    if (typeof o.bindingDirections === 'string' && o.bindingDirections.trim()) {
        next.bindingDirections = o.bindingDirections.trim();
    }
    if (typeof o.penaltyModificationText === 'string' && o.penaltyModificationText.trim()) {
        next.penaltyModificationText = o.penaltyModificationText.trim();
    }
    return Object.keys(next).length ? next : undefined;
}

function normalizeInterventionAppeal(raw: unknown): VerdictInterventionAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictInterventionAppealTrack;
    const next: VerdictInterventionAppealTrack = {};
    if (typeof o.targetedDecisionDescription === 'string' && o.targetedDecisionDescription.trim()) {
        next.targetedDecisionDescription = o.targetedDecisionDescription.trim();
    }
    if (typeof o.interventionRequestNumber === 'string' && o.interventionRequestNumber.trim()) {
        next.interventionRequestNumber = o.interventionRequestNumber.trim();
    }
    if (typeof o.referredToAuthority === 'string' && o.referredToAuthority.trim()) {
        next.referredToAuthority = o.referredToAuthority.trim();
    }
    if (typeof o.status === 'string' && o.status.trim()) next.status = o.status.trim();
    return Object.keys(next).length ? next : undefined;
}

function normalizeCorrectionAppeal(raw: unknown): VerdictCorrectionAppealTrack | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as VerdictCorrectionAppealTrack;
    const next: VerdictCorrectionAppealTrack = {};
    if (typeof o.targetedDecisionDescription === 'string' && o.targetedDecisionDescription.trim()) {
        next.targetedDecisionDescription = o.targetedDecisionDescription.trim();
    }
    if (typeof o.correctionRequestNumber === 'string' && o.correctionRequestNumber.trim()) {
        next.correctionRequestNumber = o.correctionRequestNumber.trim();
    }
    if (typeof o.filedAt === 'string' && o.filedAt.trim()) next.filedAt = o.filedAt.trim();
    if (typeof o.status === 'string' && o.status.trim()) next.status = o.status.trim();
    return Object.keys(next).length ? next : undefined;
}

export function isVerdictCassationFilingComplete(card: VerdictCard): boolean {
    const oa = card.ordinaryAppeal;
    return Boolean(card.cassationAppealFiled || String(oa?.filedAt ?? '').trim());
}

/** طعن مسجّل وإرسال الإضبارة — بانتظار قرار التمييز (بدون نتيجة). */
export function isVerdictCassationUnderReview(card: VerdictCard): boolean {
    return isVerdictCassationFilingComplete(card) && !String(card.ordinaryAppeal?.result ?? '').trim();
}

/** طلب تصحيح م 266 مُسجَّل على البطاقة. */
export function isVerdictCorrectionAppealFiled(card: VerdictCard): boolean {
    const ca = card.correctionAppeal;
    return Boolean(
        String(ca?.filedAt ?? '').trim() || String(ca?.correctionRequestNumber ?? '').trim(),
    );
}

/** طلب تصحيح مُسجَّل — بانتظار نتيجة التمييز. */
export function isVerdictCorrectionAppealPending(card: VerdictCard): boolean {
    if (!isVerdictCorrectionAppealFiled(card)) return false;
    const status = String(card.correctionAppeal?.status ?? 'pending').trim();
    return status !== 'concluded';
}

export function isVerdictOrdinaryCassationConsumed(card: VerdictCard): boolean {
    const oa = card.ordinaryAppeal;
    const filed = Boolean(
        card.cassationAppealFiled ||
            String(oa?.filedAt ?? '').trim() ||
            String(oa?.cassationDossierNumber ?? '').trim(),
    );
    const result = String(oa?.result ?? '').trim();
    return filed && Boolean(result);
}

export function resolveVerdictCassationCorrectionOutcome(card: VerdictCard): 'conviction' | 'acquittal' | '' {
    if (card.outcome === 'conviction' || card.finalDecisionKind === 'conviction_penalty') {
        return 'conviction';
    }
    if (
        card.outcome === 'acquittal' ||
        card.outcome === 'release' ||
        card.finalDecisionKind === 'acquittal' ||
        card.finalDecisionKind === 'release'
    ) {
        return 'acquittal';
    }
    return '';
}

export function resolveVerdictCassationIssuedBy(card: VerdictCard): string {
    const oa = card.ordinaryAppeal;
    const issuedBy = String(oa?.issuedBy ?? '').trim() || String(oa?.courtLabel ?? '').trim();
    if (isCassationIssuedByGeneralAssembly(issuedBy)) return issuedBy;
    const combined = `${oa?.courtLabel ?? ''} ${oa?.issuedBy ?? ''}`;
    if (/الهيئة\s*العامة/i.test(combined)) return 'الهيئة العامة';
    return issuedBy;
}

/** يُتاح طلب التصحيح (م 266) وفق م 266/267 ومصلحة الطرف ومهلة 30 يوماً. */
export function canShowVerdictCassationCorrection(
    card: VerdictCard,
    context?: {
        userRole?: CassationCorrectionUserRole;
        referenceDate?: Date;
    },
): boolean {
    if (!isVerdictOrdinaryCassationConsumed(card)) return false;

    const correction = card.correctionAppeal;
    const correctionFiled = Boolean(
        String(correction?.correctionRequestNumber ?? '').trim() ||
            String(correction?.filedAt ?? '').trim(),
    );
    if (correctionFiled) return false;

    const resultRaw = String(card.ordinaryAppeal?.result ?? '').trim();
    if (!resultRaw) return false;
    if (isVerdictCassationCorrectionBlockedResult(resultRaw)) return false;
    if (!isVerdictCassationCorrectionEligibleResult(resultRaw)) return false;
    if (isCassationIssuedByGeneralAssembly(resolveVerdictCassationIssuedBy(card))) return false;
    if (
        !hasCassationCorrectionPartyInterest(
            context?.userRole,
            resolveVerdictCassationCorrectionOutcome(card),
        )
    ) {
        return false;
    }

    const recordedAt = String(card.ordinaryAppeal?.resultRecordedAt ?? '').trim();
    if (!recordedAt) return false;
    return resolveCassationCorrectionRemainingDaysForAnchor(recordedAt, context?.referenceDate) > 0;
}

export function buildVerdictCardFromConclusion(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): VerdictCard | null {
    const outcome = conclusion.decisionType;
    if (!isVerdictCardOutcome(outcome)) return null;
    const issuedAt = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const nodeId = resolveCurrentJourneyNodeId(caseRecord.stageJourney);
    const details = String(conclusion.details ?? '').trim();
    return {
        id: `verdict_${conclusion.id}`,
        outcome,
        issuedAt,
        appealDeadline: computeAppealDeadline(issuedAt),
        sourceConclusionId: conclusion.id,
        proceduralNodeId: nodeId || undefined,
        defendantIds: conclusion.defendantIds?.length ? conclusion.defendantIds : undefined,
        decisionDraft: details || undefined,
    };
}

export function upsertVerdictCardFromConclusion(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): CriminalCase {
    const built = buildVerdictCardFromConclusion(caseRecord, conclusion);
    if (!built) return caseRecord;
    const list = normalizeVerdictCards(caseRecord.verdictCards);
    const idx = list.findIndex(
        (c) => c.id === built.id || c.sourceConclusionId === built.sourceConclusionId,
    );
    if (idx >= 0) {
        const merged = { ...list[idx]!, ...built, decisionDraft: list[idx]!.decisionDraft ?? built.decisionDraft };
        const next = list.map((c, i) => (i === idx ? merged : c));
        return { ...caseRecord, verdictCards: next };
    }
    return { ...caseRecord, verdictCards: [...list, built] };
}

export function migrateVerdictCardsOnCase(caseRecord: CriminalCase): CriminalCase {
    let next: CriminalCase = { ...caseRecord, verdictCards: normalizeVerdictCards(caseRecord.verdictCards) };
    const fd = caseRecord.finalDecision;
    if (fd && isVerdictCardOutcome(fd.decisionType)) {
        next = upsertVerdictCardFromConclusion(next, fd);
    } else {
        const session = findTrialVerdictSession(normalizeTrialSessions(caseRecord.trials));
        if (session?.verdict) {
            const pseudo: StageConclusion = {
                id: `trial_${session.id}`,
                stageType: resolveCaseStageType(caseRecord.caseStage),
                decisionType: session.verdict.outcome,
                date: session.verdict.date,
                details: `حكم ${verdictOutcomeLabel(session.verdict.outcome)} — الجلسة ${session.sessionNumber}`,
            };
            next = upsertVerdictCardFromConclusion(next, pseudo);
        }
    }
    return next;
}

function resolveCaseStageType(stage: CaseStage | undefined): StageConclusion['stageType'] {
    if (stage === 'felony') return 'felony';
    if (stage === 'investigation') return 'investigation';
    return 'misdemeanor';
}

/** يُحدّث بطاقات الغيابي المنقضية مهلة اعتراضها — للعرض والحفظ. */
export function resolveVerdictCardsLifecycle(cards: VerdictCard[], referenceDate = new Date()): VerdictCard[] {
    return normalizeVerdictCards(cards).map((c) => applyAbsentiaObjectionExpiry(c, referenceDate));
}

export function sortVerdictCardsDesc(cards: VerdictCard[]): VerdictCard[] {
    return [...cards].sort((a, b) => {
        const ta = Date.parse(String(a.issuedAt ?? ''));
        const tb = Date.parse(String(b.issuedAt ?? ''));
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
}

export type VerdictCardDisplayRow = VerdictCard & {
    sourceCardId: string;
    displayDefendantId?: string;
    displayDefendantName?: string;
};

/** بطاقة مستقلة لكل متهم عند تعدد المعنيين — مع الإبقاء على معرّف البطاقة الأصلي للتحديث. */
export function expandVerdictCardsForDisplay(
    cards: VerdictCard[],
    resolveDefendantName: (defendantId: string) => string,
): VerdictCardDisplayRow[] {
    const out: VerdictCardDisplayRow[] = [];
    for (const card of sortVerdictCardsDesc(cards)) {
        const ids = Array.isArray(card.defendantIds)
            ? card.defendantIds.map((x) => String(x ?? '').trim()).filter(Boolean)
            : [];
        if (ids.length <= 1) {
            const onlyId = ids[0];
            out.push({
                ...card,
                sourceCardId: card.id,
                displayDefendantId: onlyId,
                displayDefendantName: onlyId ? resolveDefendantName(onlyId) : undefined,
                defendantIds: onlyId ? [onlyId] : ids,
            });
            continue;
        }
        for (const defendantId of ids) {
            out.push({
                ...card,
                id: `${card.id}::${defendantId}`,
                sourceCardId: card.id,
                displayDefendantId: defendantId,
                displayDefendantName: resolveDefendantName(defendantId),
                defendantIds: [defendantId],
            });
        }
    }
    return out;
}

export function patchVerdictCardInList(
    cards: VerdictCard[],
    cardId: string,
    patch: Partial<VerdictCard>,
): VerdictCard[] {
    const id = String(cardId ?? '').trim();
    if (!id) return cards;
    return cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
}

export function mergeOrdinaryAppealTrack(
    current: VerdictOrdinaryAppealTrack | undefined,
    patch: Partial<VerdictOrdinaryAppealTrack>,
): VerdictOrdinaryAppealTrack {
    return { ...(current ?? {}), ...patch };
}

export function mergeInterventionAppealTrack(
    current: VerdictInterventionAppealTrack | undefined,
    patch: Partial<VerdictInterventionAppealTrack>,
): VerdictInterventionAppealTrack {
    return { ...(current ?? {}), ...patch };
}

export function mergeCorrectionAppealTrack(
    current: VerdictCorrectionAppealTrack | undefined,
    patch: Partial<VerdictCorrectionAppealTrack>,
): VerdictCorrectionAppealTrack {
    return { ...(current ?? {}), ...patch };
}
