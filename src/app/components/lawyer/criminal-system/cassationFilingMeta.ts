import type {
    CassationAppealRemandTarget,
    CassationAppealResult,
    CassationType,
    CaseStage,
    JourneyTransitionKind,
    ProsecutionInterventionBasis,
} from '@/app/types/criminal';
import type { CriminalCase, CriminalDefendant, StageConclusion } from './criminalCaseModel';

/** حمولة تسجيل نتيجة تمييز — مشتركة بين المحرك وتحويل قرارات الإغلاق. */
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

const CASSATION_TYPE_ARTICLE: Record<CassationType, string> = {
    federal_cassation_felony: 'م 254 — محكمة التمييز الاتحادية (أحكام الجنايات)',
    criminal_cassation_misdemeanor: 'م 254 — محكمة الجنايات بصفتها التمييزية (أحكام الجنح)',
    investigation_judge_appeal: 'م 264/أ — طعن بقرارات قاضي التحقيق',
    prosecution_intervention_264b: 'م 264/ب — تدخل تمييزي',
};

export function cassationTypeArticleLabel(type: CassationType): string {
    return CASSATION_TYPE_ARTICLE[type] ?? type;
}

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

/** تحويل قرار إغلاق الجولة إلى حمولة محرك التمييز الموحّد. */
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
