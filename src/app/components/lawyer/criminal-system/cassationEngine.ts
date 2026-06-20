// @ts-nocheck
import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    CassationOutcome,
    CassationProceeding,
    CassationProceedingStatus,
    CassationType,
    CaseStage,
    JourneyNode,
    JourneyTransitionKind,
    ProsecutionInterventionBasis,
} from '@/app/types/criminal';
import { CASSATION_APPEAL_RESULT_TO_OUTCOME, type DispositiveCassationAppealResult } from '@/app/types/criminal';
import { isDispositiveCassationResult } from './proceduralCassationResults';
import type { CriminalCase, CriminalDefendant, StageConclusion, TimelineEvent } from './criminalStore';
import {
    appendStageJourneyNode,
    buildInitialStageJourney,
    journeyNodeLabel,
    journeyNodeLabelForAppend,
    reactivateSameCourtRemandJourney,
    resolveCurrentJourneyNodeId,
} from './stageJourney';
import type { DefendantPersonalStage } from '@/app/types/criminal';
import { personalStageForDecision } from './partyPersonalStage';
import { syncStoredStageFromJourneyCaseStage, shouldUseJuvenileTrialJourneyLabels } from './criminalStageUtils';

function createId(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function juvenileJourneyLabelOptions(
    caseRecord: CriminalCase,
    defendantIds?: string[],
): { juvenileTrialDisplay?: boolean } {
    return {
        juvenileTrialDisplay: shouldUseJuvenileTrialJourneyLabels(
            Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [],
            { defendantIds, storedStage: caseRecord.basics?.stage },
        ),
    };
}

function applyPersonalStagesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    personalStage: DefendantPersonalStage,
    patch?: Partial<CriminalDefendant>,
): CriminalCase {
    const idSet = new Set(defendantIds);
    return {
        ...caseRecord,
        defendants: (caseRecord.defendants ?? []).map((d) =>
            idSet.has(d.id) ? { ...d, personalStage, ...patch } : d,
        ),
    };
}

export type RecordCassationResultPayload = {
    result: CassationAppealResult;
    date: string;
    details: string;
    isObjectiveGrounds: boolean;
    targetDefendantIds?: string[];
    remandTargetStage?: CassationAppealRemandTarget;
    modifiedCharge?: string;
    modifiedArticle?: string;
    /** طعن من السجل القضائي — يُنشئ proceeding افتراضياً عند غياب proceeding عام. */
    virtualAppellantDefendantIds?: string[];
    virtualCassationType?: CassationType;
    /** تخصيص حدث السجل الزمني (مسار السجل القضائي — يمنع الازدواج). */
    timelineOverlay?: { title?: string; category?: string };
    /** عند التسجيل من السجل القضائي — لا يُحقَن حدث في المسار الإجرائي (الشارة على القرار كافية). */
    suppressTimelineAppend?: boolean;
    /** نقض وإعادة لنفس المحكمة — إعادة تفعيل العقدة الحالية دون مسار تتبع جديد. */
    sameCourtRetrialRemand?: boolean;
};

function mergeCassationTimelineEvents(
    caseRecord: CriminalCase,
    event: TimelineEvent,
    suppress?: boolean,
): TimelineEvent[] {
    const base = Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : [];
    if (suppress) return base;
    return [...base, event];
}

export type RecordCassationResultOutcome = {
    caseRecord: CriminalCase;
    error?: string;
};

const EMPTY_BENEFICIARY_GUARD_ERROR =
    'يجب تحديد المستفيدين من النقض/الاستدراك صراحةً (أسباب شخصية — م 269/ب). تم منع تعديل مصائر جميع المتهمين بالخطأ.';

const EMPTY_VIRTUAL_APPELLANT_ERROR =
    'يجب تحديد متهم واحد على الأقل كطاعن/مرجع للطعن التمييزي (أسباب شخصية — لا يُقبل تعميم الطعن على جميع المتهمين تلقائياً).';

/** قرارات إغلاق المرحلة ذات أثر نقض/إعادة/تعديل (لربط 269/ب في الواجهة). */
export const CASSATION_CLOSURE_QUASH_DECISION_TYPES = [
    'cassation_quash_remand',
    'cassation_quash_acquit_release',
    'cassation_quash_reduce',
    'cassation_quash_investigation',
    'cassation_quash_trial_misdemeanor',
    'cassation_quash_trial_felony',
] as const;

export type CassationClosureQuashDecisionType = (typeof CASSATION_CLOSURE_QUASH_DECISION_TYPES)[number];

export function isCassationClosureQuashDecision(decisionType: string): boolean {
    return (CASSATION_CLOSURE_QUASH_DECISION_TYPES as readonly string[]).includes(
        String(decisionType ?? '').trim(),
    );
}

function resolveExplicitPartyIds(payload: RecordCassationResultPayload): string[] {
    const ids = (
        Array.isArray(payload.virtualAppellantDefendantIds) ? payload.virtualAppellantDefendantIds : []
    )
        .concat(Array.isArray(payload.targetDefendantIds) ? payload.targetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    return [...new Set(ids)];
}

function requiresExplicitVirtualAppellants(payload: RecordCassationResultPayload): boolean {
    if (payload.isObjectiveGrounds === true) return false;
    return (
        payload.result === 'affirmation' ||
        payload.result === 'quash_modify' ||
        payload.result === 'quash_dismissal' ||
        payload.result === 'quash_remand'
    );
}

/** يمنع proceeding افتراضياً يشمل كل المتهمين طاعنين عند أسباب شخصية. */
export function guardVirtualProceedingAppellants(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): string | null {
    const existing =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    if (existing) return null;
    if (!requiresExplicitVirtualAppellants(payload)) return null;
    if (resolveExplicitPartyIds(payload).length === 0) {
        return EMPTY_VIRTUAL_APPELLANT_ERROR;
    }
    return null;
}

function resolveVirtualCassationType(caseRecord: CriminalCase, override?: CassationType): CassationType {
    if (override) return override;
    const stage = resolveStageBeforeCassation(caseRecord);
    if (stage === 'investigation') return 'investigation_judge_appeal';
    if (stage === 'felony') return 'federal_cassation_felony';
    return 'criminal_cassation_misdemeanor';
}

/** إنشاء أو استعادة سجل الطعن النشط — لا يُرجع أبداً undefined. */
export function resolveOrCreateCassationProceeding(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): CassationProceeding {
    const existing =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    if (existing) return existing;

    const explicitAppellants = resolveExplicitPartyIds(payload);
    const fallbackAppellants = requiresExplicitVirtualAppellants(payload)
        ? explicitAppellants
        : explicitAppellants.length
          ? explicitAppellants
          : (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
    const filedAt = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);

    return {
        id: createId(),
        cassationType: resolveVirtualCassationType(caseRecord, payload.virtualCassationType),
        status: 'pending',
        filedAt,
        cassationNumber: 'سجل قضائي',
        appellantDefendantIds: fallbackAppellants,
        stageBeforeCassation: resolveStageBeforeCassation(caseRecord),
    };
}

function guardPersonalQuashBeneficiaries(
    result: CassationAppealResult,
    shared269b: boolean,
    explicitTargetDefendantIds?: string[],
): string | null {
    if (shared269b) return null;
    if (result !== 'quash_dismissal' && result !== 'quash_remand' && result !== 'quash_modify') {
        return null;
    }
    const explicit = (Array.isArray(explicitTargetDefendantIds) ? explicitTargetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (explicit.length === 0) {
        return EMPTY_BENEFICIARY_GUARD_ERROR;
    }
    return null;
}

export function resolvePersonalBeneficiaryIds(
    caseRecord: CriminalCase,
    shared269b: boolean,
    explicitTargetDefendantIds?: string[],
): string[] {
    if (shared269b) {
        return (caseRecord.defendants ?? []).map((d) => d.id).filter(Boolean);
    }
    return (Array.isArray(explicitTargetDefendantIds) ? explicitTargetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
}

function buildCassationTimelineEvent(
    date: string,
    fallback: {
        category: string;
        title: string;
        description: string;
        defendantIds?: string[];
        proceduralNodeId?: string;
    },
    overlay?: { title?: string; category?: string },
): TimelineEvent {
    return {
        id: createId(),
        date,
        type: 'decision',
        category: overlay?.category ?? fallback.category,
        title: overlay?.title ?? fallback.title,
        description: fallback.description,
        defendantIds: fallback.defendantIds,
        proceduralNodeId: fallback.proceduralNodeId,
    };
}

export type InitiateCassationPayload = {
    cassationType: CassationType;
    filedAt: string;
    details: string;
    cassationNumber: string;
    panelName?: string;
    sentDate?: string;
    interventionBasis?: ProsecutionInterventionBasis;
    appellantDefendantIds: string[];
};

const CASSATION_TYPE_ARTICLE: Record<CassationType, string> = {
    federal_cassation_felony: 'م 254 — محكمة التمييز الاتحادية (أحكام الجنايات)',
    criminal_cassation_misdemeanor: 'م 254 — محكمة الجنايات بصفتها التمييزية (أحكام الجنح)',
    investigation_judge_appeal: 'م 264/أ — طعن بقرارات قاضي التحقيق',
    prosecution_intervention_264b: 'م 264/ب — تدخل تمييزي',
};

export const CASSATION_FILING_TYPE_OPTIONS: { value: CassationType; label: string }[] = [
    {
        value: 'federal_cassation_felony',
        label: 'طعن تمييزي',
    },
    {
        value: 'criminal_cassation_misdemeanor',
        label: 'طعن تمييزي',
    },
    {
        value: 'investigation_judge_appeal',
        label: 'طعن تمييزي',
    },
    {
        value: 'prosecution_intervention_264b',
        label: 'تدخل تمييزي',
    },
];

/** فلترة قنوات الإرسال للتمييز حسب مرحلة الإضبارة الحالية. */
export function availableCassationTypesForStage(
    stageLabel: string,
    caseStage: CaseStage,
): CassationType[] {
    if (stageLabel === 'محكمة الجنح' || caseStage === 'misdemeanor') {
        return ['criminal_cassation_misdemeanor', 'prosecution_intervention_264b'];
    }
    return CASSATION_FILING_TYPE_OPTIONS.map((option) => option.value);
}

export function cassationFilingTypeLabel(type: CassationType): string {
    return CASSATION_FILING_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

export function cassationTransitionLabel(
    type: CassationType,
    interventionBasis?: ProsecutionInterventionBasis,
): string {
    const base = CASSATION_TYPE_ARTICLE[type];
    if (type !== 'prosecution_intervention_264b') return base;
    const basis =
        interventionBasis === 'prosecutor_general_review'
            ? 'مطالعة رئيس الادعاء العام'
            : interventionBasis === 'parties_request'
              ? 'طلب الخصوم'
              : interventionBasis === 'court_sua_sponte'
                ? 'المحكمة تلقائياً'
                : '—';
    return `${base} — ${basis}`;
}

export function cassationUsesVerticalAscend(type: CassationType): boolean {
    return type === 'federal_cassation_felony' || type === 'criminal_cassation_misdemeanor';
}

export function cassationJourneyTransitionKind(type: CassationType): JourneyTransitionKind {
    return cassationUsesVerticalAscend(type) ? 'cassation_ascend' : 'cassation_parallel_ascend';
}

export function resolveStageBeforeCassation(caseRecord: CriminalCase): CaseStage {
    const fromProceeding = caseRecord.cassationProceeding?.stageBeforeCassation;
    if (fromProceeding) return fromProceeding;
    const journey = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : [];
    const lastTrial = [...journey].reverse().find((n) => n.stage === 'felony' || n.stage === 'misdemeanor');
    if (lastTrial) return lastTrial.stage;
    const cs = caseRecord.caseStage;
    if (cs && cs !== 'cassation') return cs;
    return caseRecord.basics.crimeType === 'جناية' ? 'felony' : 'misdemeanor';
}

export function resolveQuashBeneficiaryIds(
    defendants: CriminalDefendant[],
    appellantIds: string[],
    sharedObjectiveGrounds269b: boolean,
    targetDefendantIds?: string[],
): string[] {
    const all = (Array.isArray(defendants) ? defendants : []).map((d) => d.id).filter(Boolean);
    if (sharedObjectiveGrounds269b) return all;
    const targets = (Array.isArray(targetDefendantIds) ? targetDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    if (targets.length) return targets;
    const appellants = (Array.isArray(appellantIds) ? appellantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    return appellants.length ? appellants : all;
}

export function isUnderInterventionReview(caseRecord: CriminalCase | undefined): boolean {
    if (!caseRecord) return false;
    if (caseRecord.cassationProceeding?.status === 'under_intervention_review') return true;
    const nodes = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : [];
    return nodes.some(
        (n) => n.status === 'current' && n.phaseOverlay === 'under_intervention_review',
    );
}

export function migrateLegacyCassationToProceeding(
    caseRecord: CriminalCase,
): CassationProceeding | undefined {
    const legacy = caseRecord.cassationCaseDetails;
    if (!caseRecord.isSentToCassation && !legacy) return caseRecord.cassationProceeding;
    if (caseRecord.cassationProceeding) return caseRecord.cassationProceeding;
    const stageBefore = resolveStageBeforeCassation(caseRecord);
    const type: CassationType =
        stageBefore === 'felony' ? 'federal_cassation_felony' : 'criminal_cassation_misdemeanor';
    return {
        id: createId(),
        cassationType: type,
        status: 'pending',
        filedAt: String(legacy?.sentDate ?? '').trim() || new Date().toISOString().slice(0, 10),
        cassationNumber: String(legacy?.cassationNumber ?? '').trim() || '—',
        panelName: String(legacy?.panelName ?? '').trim() || undefined,
        sentDate: String(legacy?.sentDate ?? '').trim() || undefined,
        appellantDefendantIds: (caseRecord.defendants ?? []).map((d) => d.id),
        stageBeforeCassation: stageBefore,
    };
}

function stampCassationNodes(
    nodes: JourneyNode[],
    filterNodeId: string,
    type: CassationType,
): JourneyNode[] {
    return nodes.map((n) =>
        n.id === filterNodeId
            ? {
                  ...n,
                  cassationType: type,
                  isCassationFilterNode: true,
              }
            : n,
    );
}

/** تقديم طعن/تدخل — حقن المسار والحالة الإجرائية. */
export function applyCassationFiling(caseRecord: CriminalCase, payload: InitiateCassationPayload): CriminalCase {
    const filedAt = String(payload.filedAt ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(payload.details ?? '').trim();
    const cassationNumber = String(payload.cassationNumber ?? '').trim();
    if (!cassationNumber) return caseRecord;

    const appellantIds = (Array.isArray(payload.appellantDefendantIds) ? payload.appellantDefendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const stageBefore = resolveStageBeforeCassation(caseRecord);
    const transitionText = cassationTransitionLabel(payload.cassationType, payload.interventionBasis);
    const transitionKind = cassationJourneyTransitionKind(payload.cassationType);
    const filterNodeId = createId();

    const proceeding: CassationProceeding = {
        id: createId(),
        cassationType: payload.cassationType,
        status:
            payload.cassationType === 'prosecution_intervention_264b'
                ? 'under_intervention_review'
                : 'pending',
        filedAt,
        cassationNumber,
        panelName: String(payload.panelName ?? '').trim() || undefined,
        sentDate: String(payload.sentDate ?? '').trim() || undefined,
        interventionBasis: payload.interventionBasis,
        appellantDefendantIds: appellantIds,
        stageBeforeCassation: stageBefore,
        journeyFilterNodeId: filterNodeId,
    };

    const priorNodes = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney();
    let nodes: JourneyNode[] = priorNodes;

    if (payload.cassationType === 'prosecution_intervention_264b') {
        nodes = priorNodes.map((n) =>
            n.status === 'current'
                ? {
                      ...n,
                      phaseOverlay: 'under_intervention_review' as const,
                      transitionText,
                      transitionKind,
                      cassationType: payload.cassationType,
                      isCassationFilterNode: true,
                  }
                : n,
        );
    } else if (cassationUsesVerticalAscend(payload.cassationType)) {
        const label =
            payload.cassationType === 'federal_cassation_felony'
                ? `تمييز اتحادية: ${cassationNumber}`
                : `تمييز جنح: ${cassationNumber}`;
        nodes = appendStageJourneyNode(priorNodes, {
            id: filterNodeId,
            stage: 'cassation',
            label,
            transitionText,
            transitionKind,
            startedAt: filedAt,
            cassationType: payload.cassationType,
            isCassationFilterNode: true,
        });
    } else {
        const stage = payload.cassationType === 'investigation_judge_appeal' ? 'investigation' : stageBefore;
        nodes = appendStageJourneyNode(priorNodes, {
            id: filterNodeId,
            stage,
            label: `${journeyNodeLabel(stage, undefined, juvenileJourneyLabelOptions(caseRecord, appellantIds))} — ${cassationNumber}`,
            transitionText,
            transitionKind,
            startedAt: filedAt,
            cassationType: payload.cassationType,
            isCassationFilterNode: true,
        });
    }

    nodes = stampCassationNodes(nodes, filterNodeId, payload.cassationType);
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);

    const event = {
        id: createId(),
        date: filedAt,
        type: 'decision' as const,
        category: 'طعن/تدخل تمييزي',
        title: transitionText,
        description: details || transitionText,
        defendantIds: appellantIds.length ? appellantIds : undefined,
        proceduralNodeId: activeNodeId,
    };

    const storedStage =
        payload.cassationType === 'investigation_judge_appeal'
            ? syncStoredStageFromJourneyCaseStage('investigation', caseRecord.basics?.stage)
            : cassationUsesVerticalAscend(payload.cassationType)
              ? 'cassation_court'
              : caseRecord.basics.stage;

    return {
        ...caseRecord,
        cassationProceeding: proceeding,
        isSentToCassation: cassationUsesVerticalAscend(payload.cassationType) || caseRecord.isSentToCassation,
        cassationCaseDetails: {
            cassationNumber,
            sentDate: String(payload.sentDate ?? filedAt).trim(),
            panelName: String(payload.panelName ?? '').trim() || '—',
        },
        stageJourney: nodes,
        caseStage:
            payload.cassationType === 'investigation_judge_appeal'
                ? 'investigation'
                : cassationUsesVerticalAscend(payload.cassationType)
                  ? 'cassation'
                  : caseRecord.caseStage ?? stageBefore,
        basics: { ...caseRecord.basics, stage: storedStage },
        timelineEvents: [...(Array.isArray(caseRecord.timelineEvents) ? caseRecord.timelineEvents : []), event],
    };
}

function remandTargetStage(type: CassationType, stageBefore: CaseStage): CaseStage {
    if (type === 'investigation_judge_appeal' || stageBefore === 'investigation') return 'investigation';
    if (type === 'federal_cassation_felony' || stageBefore === 'felony') return 'felony';
    return 'misdemeanor';
}

function resolveRemandCaseStage(
    proceeding: CassationProceeding,
    override?: CassationAppealRemandTarget,
): CaseStage {
    if (override === 'investigation' || override === 'misdemeanor' || override === 'felony') {
        return override;
    }
    return remandTargetStage(proceeding.cassationType, proceeding.stageBeforeCassation);
}

function applyQuashRemandJourney(
    caseRecord: CriminalCase,
    date: string,
    details: string,
    proceeding: CassationProceeding,
    options: {
        isObjectiveGrounds: boolean;
        beneficiaryIds: string[];
        remandTargetStage?: CassationAppealRemandTarget;
        timelineOverlay?: { title?: string; category?: string };
        suppressTimelineAppend?: boolean;
        sameCourtRetrialRemand?: boolean;
    },
): CriminalCase {
    const target = resolveRemandCaseStage(proceeding, options.remandTargetStage);
    const priorNodes = Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : buildInitialStageJourney();
    const transitionText = options.sameCourtRetrialRemand
        ? 'نقض وإعادة الأوراق لإعادة المحاكمة'
        : `نقض وإعادة — جولة ثانية م/269 — ${CASSATION_TYPE_ARTICLE[proceeding.cassationType]}`;
    const scopeIds = options.isObjectiveGrounds
        ? undefined
        : options.beneficiaryIds.length
          ? options.beneficiaryIds
          : undefined;
    const nodes = options.sameCourtRetrialRemand
        ? reactivateSameCourtRemandJourney(priorNodes, target, date)
        : appendStageJourneyNode(priorNodes, {
              stage: target,
              label: journeyNodeLabelForAppend(
                  target,
                  priorNodes,
                  caseRecord.courtCaseNumber,
                  juvenileJourneyLabelOptions(caseRecord, scopeIds),
              ),
              transitionText,
              arrowLabel: transitionText,
              transitionKind: 'cassation_descend',
              startedAt: date,
              targetDefendantIds: scopeIds,
              defendantIds: scopeIds,
          });
    const activeNodeId = resolveCurrentJourneyNodeId(nodes);
    const storedStage =
        target === 'investigation'
            ? syncStoredStageFromJourneyCaseStage('investigation', caseRecord.basics?.stage)
            : target === 'felony'
              ? 'محكمة الجنايات'
              : syncStoredStageFromJourneyCaseStage('misdemeanor', caseRecord.basics?.stage);
    return {
        ...caseRecord,
        stageJourney: nodes,
        caseStage: target,
        basics: { ...caseRecord.basics, stage: storedStage },
        isInvestigationLocked: false,
        isFrozen: false,
        finalDecision: undefined,
        isSentToCassation: false,
        timelineEvents: mergeCassationTimelineEvents(
            caseRecord,
            buildCassationTimelineEvent(
                date,
                {
                    category: 'نقض تمييزي وإعادة',
                    title: transitionText,
                    description: details,
                    proceduralNodeId: activeNodeId,
                    defendantIds: scopeIds,
                },
                options.timelineOverlay,
            ),
            options.suppressTimelineAppend,
        ),
    };
}

function applyAffirmationLocks(caseRecord: CriminalCase, date: string): CriminalCase {
    const nodes = (Array.isArray(caseRecord.stageJourney) ? caseRecord.stageJourney : []).map((n) => {
        if (n.status !== 'current') return n;
        if (n.stage === 'cassation') {
            return { ...n, status: 'past' as const, endedAt: date };
        }
        return n;
    });
    return {
        ...caseRecord,
        stageJourney: nodes.length ? nodes : caseRecord.stageJourney,
        isInvestigationLocked: true,
        isFrozen: true,
        isSentToCassation: false,
    };
}

/** معالجة مخرجات الاستدراك التمييزي — واجهة المرحلة 2. */
export function recordCassationResult(
    caseRecord: CriminalCase,
    payload: RecordCassationResultPayload,
): RecordCassationResultOutcome {
    const virtualGuard = guardVirtualProceedingAppellants(caseRecord, payload);
    if (virtualGuard) {
        return { caseRecord, error: virtualGuard };
    }

    const proceeding = resolveOrCreateCassationProceeding(caseRecord, payload);

    const date = String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(payload.details ?? '').trim();
    const shared269b = payload.isObjectiveGrounds === true;
    const guardError = guardPersonalQuashBeneficiaries(
        payload.result,
        shared269b,
        payload.targetDefendantIds,
    );
    const beneficiaryIds = resolvePersonalBeneficiaryIds(
        caseRecord,
        shared269b,
        payload.targetDefendantIds,
    );
    if (guardError) {
        return { caseRecord, error: guardError };
    }

    if (!isDispositiveCassationResult(payload.result)) {
        return { caseRecord, error: 'نتيجة غير مدعومة في مسار الحسم الختامي للتمييز.' };
    }
    const outcome: CassationOutcome = CASSATION_APPEAL_RESULT_TO_OUTCOME[payload.result as DispositiveCassationAppealResult];
    const concludedProceeding: CassationProceeding = {
        ...proceeding,
        status: 'concluded',
        outcome,
        sharedObjectiveGrounds269b: shared269b,
        concludedAt: date,
        conclusionDetails: details,
    };

    let next: CriminalCase = {
        ...caseRecord,
        cassationProceeding: concludedProceeding,
        isSentToCassation: proceeding.cassationType === 'federal_cassation_felony' || proceeding.cassationType === 'criminal_cassation_misdemeanor',
    };

    if (payload.result === 'affirmation') {
        next = applyAffirmationLocks(next, date);
        return {
            caseRecord: {
            ...next,
            isArchived: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_confirm',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'تصديق تمييزي',
                        title: 'تصديق الحكم — إغلاق الطعن',
                        description: details || 'تصديق الحكم التمييزي وتثبيت أقفال المرحلة السابقة.',
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
            },
        };
    }

    if (payload.result === 'quash_modify') {
        const article = String(payload.modifiedArticle ?? '').trim();
        const charge = String(payload.modifiedCharge ?? '').trim();
        const summary = [charge, article, details].filter(Boolean).join(' • ');
        if (shared269b) {
            if (article) {
                next = {
                    ...next,
                    basics: { ...next.basics, legalArticle: article },
                    legalArticleHistory: [
                        ...(Array.isArray(next.legalArticleHistory) ? next.legalArticleHistory : []),
                        {
                            id: createId(),
                            article,
                            changedAtDate: date,
                            changedBy: 'trial_court',
                        },
                    ],
                };
            }
        } else {
            next = applyPersonalStagesToDefendants(next, beneficiaryIds, 'convicted');
        }
        return {
            caseRecord: {
            ...next,
            isFrozen: true,
            isInvestigationLocked: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_reduce',
                date,
                details: summary || details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'نقض تمييزي — تعديل',
                        title: 'نقض وتعديل الوصف/المادة',
                        description: summary || details,
                        defendantIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
            },
        };
    }

    if (payload.result === 'quash_dismissal') {
        next = applyPersonalStagesToDefendants(next, beneficiaryIds, 'acquitted', {
            status: 'حر',
            isPartyRecordLocked: true,
        });
        next = {
            ...next,
            defendants: (next.defendants ?? []).map((d) => {
                if (!beneficiaryIds.includes(d.id)) return d;
                return {
                    ...d,
                    status: 'حر' as const,
                    personalStage: 'acquitted' as DefendantPersonalStage,
                    isPartyRecordLocked: true,
                    detentionAuthority: '',
                    detentionExpiryDate: '',
                };
            }),
            isFrozen: true,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_acquit_release',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
            timelineEvents: mergeCassationTimelineEvents(
                next,
                buildCassationTimelineEvent(
                    date,
                    {
                        category: 'نقض تمييزي — إفراج نهائي',
                        title: 'نقض واستدراك — براءة نهائية',
                        description: details,
                        defendantIds: beneficiaryIds.length ? beneficiaryIds : undefined,
                    },
                    payload.timelineOverlay,
                ),
                payload.suppressTimelineAppend,
            ),
        };
        const allTerminal = (next.defendants ?? []).every(
            (d) => d.personalStage === 'acquitted' || d.personalStage === 'lawsuit_dropped_death',
        );
        return { caseRecord: { ...next, isArchived: allTerminal } };
    }

    if (payload.result === 'quash_remand') {
        const ps = personalStageForDecision(
            proceeding.cassationType === 'investigation_judge_appeal'
                ? 'cassation_quash_investigation'
                : resolveRemandCaseStage(proceeding, payload.remandTargetStage) === 'felony'
                  ? 'cassation_quash_trial_felony'
                  : resolveRemandCaseStage(proceeding, payload.remandTargetStage) === 'investigation'
                    ? 'cassation_quash_investigation'
                    : 'cassation_quash_trial_misdemeanor',
        );
        if (ps) {
            next = applyPersonalStagesToDefendants(next, beneficiaryIds, ps);
        }
        next = {
            ...next,
            cassationProceeding: concludedProceeding,
            finalDecision: {
                id: createId(),
                stageType: 'cassation',
                decisionType: 'cassation_quash_remand',
                date,
                details,
                defendantStatusAtDecision: 'bailed',
                sharedObjectiveGrounds269b: shared269b,
                targetDefendantIds: beneficiaryIds,
            },
        };
        return {
            caseRecord: applyQuashRemandJourney(next, date, details, proceeding, {
                isObjectiveGrounds: shared269b,
                beneficiaryIds,
                remandTargetStage: payload.remandTargetStage,
                timelineOverlay: payload.timelineOverlay,
                suppressTimelineAppend: payload.suppressTimelineAppend,
                sameCourtRetrialRemand: payload.sameCourtRetrialRemand === true,
            }),
        };
    }

    return { caseRecord: next };
}

const CASSATION_ENGINE_DECISION_TYPES = new Set([
    'cassation_confirm',
    'cassation_quash_remand',
    'cassation_quash_reduce',
    'cassation_quash_acquit_release',
    'cassation_quash_investigation',
    'cassation_quash_trial_misdemeanor',
    'cassation_quash_trial_felony',
]);

export function isCassationEngineDecisionType(decisionType: string): boolean {
    return CASSATION_ENGINE_DECISION_TYPES.has(String(decisionType ?? '').trim());
}

/** تحويل قرار إغلاج الجولة إلى حمولة محرك التمييز الموحّد. */
export function stageConclusionToCassationPayload(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): RecordCassationResultPayload | null {
    const dt = String(conclusion.decisionType ?? '').trim();
    if (!isCassationEngineDecisionType(dt)) return null;

    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim();
    const shared269b = conclusion.sharedObjectiveGrounds269b === true;
    const targets = (Array.isArray(conclusion.targetDefendantIds) ? conclusion.targetDefendantIds : [])
        .concat(Array.isArray(conclusion.defendantIds) ? conclusion.defendantIds : [])
        .map((x) => String(x ?? '').trim())
        .filter(Boolean);
    const uniqueTargets = [...new Set(targets)];
    const virtual =
        caseRecord.cassationProceeding?.appellantDefendantIds?.length
            ? caseRecord.cassationProceeding.appellantDefendantIds
            : uniqueTargets.length
              ? uniqueTargets
              : undefined;

    if (dt === 'cassation_confirm') {
        return {
            result: 'affirmation',
            date,
            details,
            isObjectiveGrounds: shared269b,
            targetDefendantIds: uniqueTargets.length ? uniqueTargets : undefined,
            virtualAppellantDefendantIds: virtual,
        };
    }
    if (dt === 'cassation_quash_acquit_release') {
        return {
            result: 'quash_dismissal',
            date,
            details,
            isObjectiveGrounds: shared269b,
            targetDefendantIds: uniqueTargets.length ? uniqueTargets : undefined,
            virtualAppellantDefendantIds: virtual,
        };
    }
    if (dt === 'cassation_quash_reduce') {
        return {
            result: 'quash_modify',
            date,
            details,
            isObjectiveGrounds: shared269b,
            targetDefendantIds: uniqueTargets.length ? uniqueTargets : undefined,
            modifiedArticle: details,
            virtualAppellantDefendantIds: virtual,
        };
    }

    const remandTargetStage: CassationAppealRemandTarget | undefined =
        dt === 'cassation_quash_investigation'
            ? 'investigation'
            : dt === 'cassation_quash_trial_misdemeanor'
              ? 'misdemeanor'
              : dt === 'cassation_quash_trial_felony'
                ? 'felony'
                : undefined;

    if (
        dt === 'cassation_quash_remand' ||
        dt === 'cassation_quash_investigation' ||
        dt === 'cassation_quash_trial_misdemeanor' ||
        dt === 'cassation_quash_trial_felony'
    ) {
        return {
            result: 'quash_remand',
            date,
            details,
            isObjectiveGrounds: shared269b,
            targetDefendantIds: uniqueTargets.length ? uniqueTargets : undefined,
            remandTargetStage,
            virtualAppellantDefendantIds: virtual,
        };
    }

    return null;
}

export function applyCassationOutcome(
    caseRecord: CriminalCase,
    conclusion: StageConclusion,
): CriminalCase {
    const date = String(conclusion.date ?? '').trim() || new Date().toISOString().slice(0, 10);
    const details = String(conclusion.details ?? '').trim();
    const shared269b = conclusion.sharedObjectiveGrounds269b === true;
    const proceeding =
        caseRecord.cassationProceeding ?? migrateLegacyCassationToProceeding(caseRecord);
    const appellants = proceeding?.appellantDefendantIds ?? [];

    const appealResult: CassationAppealResult | null =
        conclusion.decisionType === 'cassation_confirm'
            ? 'affirmation'
            : conclusion.decisionType === 'cassation_quash_remand'
              ? 'quash_remand'
              : conclusion.decisionType === 'cassation_quash_acquit_release'
                ? 'quash_dismissal'
                : conclusion.decisionType === 'cassation_quash_reduce'
                  ? 'quash_modify'
                  : null;

    if (!appealResult) return caseRecord;

    const out = recordCassationResult(caseRecord, {
        result: appealResult,
        date,
        details,
        isObjectiveGrounds: shared269b,
        targetDefendantIds: conclusion.targetDefendantIds ?? conclusion.defendantIds,
        virtualAppellantDefendantIds:
            appellants.length ? appellants : (conclusion.targetDefendantIds ?? conclusion.defendantIds),
        modifiedArticle: appealResult === 'quash_modify' ? details : undefined,
    });
    return out.error ? caseRecord : out.caseRecord;
}
