import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import type { CriminalCaseStage, CriminalDefendant, CrimeType, StageConclusion } from './criminalCaseModel';
import { getCurrentJourneyNode, repairSameCourtRemandJourneyNodes } from './stageJourneyRuntimeCore';

export function caseStageFromStoredStage(stage: string): CaseStage | null {
    const key = stageToProceduralKey(stage);
    if (key === 'investigation' || key === 'juvenile_investigation') return 'investigation';
    if (key === 'misdemeanor' || key === 'juvenile_trial') return 'misdemeanor';
    if (key === 'felony') return 'felony';
    if (String(stage ?? '').trim() === 'cassation_court') return 'cassation';
    return null;
}

export function storedStageFromCaseStage(caseStage: CaseStage): CriminalCaseStage {
    if (caseStage === 'investigation') return 'مرحلة التحقيق';
    if (caseStage === 'misdemeanor') return 'محكمة الجنح';
    if (caseStage === 'felony') return 'محكمة الجنايات';
    return 'cassation_court';
}

export function isInvestigationStoredStage(stage: string): boolean {
    return stage === 'مرحلة التحقيق' || stage === 'تحقيق الأحداث';
}

/** يحدّد نوع القرار الختامي (stageType) بناءً على المرحلة المخزّنة الحالية. */
export function stageTypeFromStage(s: string): StageConclusion['stageType'] | null {
    if (isInvestigationStoredStage(s)) return 'investigation';
    if (s === 'محكمة الجنح' || s === 'محكمة الأحداث') return 'misdemeanor';
    if (s === 'محكمة الجنايات') return 'felony';
    if (s === 'cassation_court') return 'cassation';
    return null;
}

export function syncStoredStageFromJourneyCaseStage(
    caseStage: CaseStage,
    existingStoredStage?: string,
): CriminalCaseStage {
    const existing = String(existingStoredStage ?? '').trim();
    if (caseStage === 'investigation' && isInvestigationStoredStage(existing)) {
        return existing as CriminalCaseStage;
    }
    if (caseStage === 'misdemeanor' && existing === 'محكمة الأحداث') {
        return 'محكمة الأحداث';
    }
    return storedStageFromCaseStage(caseStage);
}

export function resolveCaseStageFromRecord(
    record: { caseStage?: CaseStage; basics?: { stage?: string }; isSentToCassation?: boolean } | undefined,
): CaseStage {
    const explicit = String(record?.caseStage ?? '').trim();
    if (
        explicit === 'investigation' ||
        explicit === 'misdemeanor' ||
        explicit === 'felony' ||
        explicit === 'cassation'
    ) {
        return explicit;
    }
    if (record?.isSentToCassation) return 'cassation';
    const fromStage = caseStageFromStoredStage(String(record?.basics?.stage ?? ''));
    return fromStage ?? 'investigation';
}

export function resolveOperationalCaseStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    const fromRecord = resolveCaseStageFromRecord(record);
    const journeyRaw = Array.isArray(record.stageJourney) ? record.stageJourney : [];
    const journey = journeyRaw.length > 0 ? repairSameCourtRemandJourneyNodes(journeyRaw) : [];

    if (fromRecord === 'investigation' && record.isInvestigationLocked !== true) {
        return 'investigation';
    }

    if (journey.length > 0) {
        const fromJourney = getCurrentJourneyNode(journey)?.stage;
        if (
            fromJourney === 'investigation' ||
            fromJourney === 'misdemeanor' ||
            fromJourney === 'felony' ||
            fromJourney === 'cassation'
        ) {
            return fromJourney;
        }
    }

    return fromRecord;
}

export function resolveMergeEligibilityStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    const fromRecord = resolveCaseStageFromRecord(record);
    if (fromRecord === 'investigation') {
        return 'investigation';
    }

    const stored = String(record.basics?.stage ?? '').trim();
    const investigationLocked = record.isInvestigationLocked === true;
    const journeyRaw = Array.isArray(record.stageJourney) ? record.stageJourney : [];

    if (journeyRaw.length > 0) {
        const rawCurrent = getCurrentJourneyNode(journeyRaw)?.stage;
        if (rawCurrent === 'investigation') return 'investigation';
    }

    if (isInvestigationStoredStage(stored) && !investigationLocked) {
        return 'investigation';
    }

    if (journeyRaw.length > 0) {
        const journey = repairSameCourtRemandJourneyNodes(journeyRaw);
        const fromJourney = getCurrentJourneyNode(journey)?.stage;
        if (
            fromJourney === 'investigation' ||
            fromJourney === 'misdemeanor' ||
            fromJourney === 'felony' ||
            fromJourney === 'cassation'
        ) {
            return fromJourney;
        }
    }

    return resolveCaseStageFromRecord(record);
}

export type MergeStageBucket =
    | 'investigation'
    | 'juvenile_investigation'
    | 'misdemeanor'
    | 'felony'
    | 'juvenile_trial'
    | 'cassation';

export function resolveMergeStageBucket(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
          }
        | undefined,
): MergeStageBucket {
    if (!record) return 'investigation';

    const stored = String(record.basics?.stage ?? '').trim();
    const procKey = stored ? stageToProceduralKey(stored) : null;
    if (procKey === 'juvenile_investigation') return 'juvenile_investigation';
    if (procKey === 'juvenile_trial') return 'juvenile_trial';
    if (procKey === 'investigation') return 'investigation';
    if (procKey === 'misdemeanor') return 'misdemeanor';
    if (procKey === 'felony') return 'felony';
    if (procKey === 'cassation') return 'cassation';

    if (record.isSentToCassation) return 'cassation';
    const fromRecord = resolveCaseStageFromRecord(record);
    if (fromRecord === 'cassation') return 'cassation';
    if (fromRecord === 'misdemeanor') return 'misdemeanor';
    if (fromRecord === 'felony') return 'felony';
    return 'investigation';
}

export function resolveMergeComparisonStage(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              isSentToCassation?: boolean;
              isInvestigationLocked?: boolean;
              stageJourney?: JourneyNode[];
          }
        | undefined,
): CaseStage {
    if (!record) return 'investigation';

    const bucket = resolveMergeStageBucket(record);
    if (bucket === 'juvenile_investigation' || bucket === 'investigation') return 'investigation';
    if (bucket === 'juvenile_trial') return 'misdemeanor';
    if (bucket === 'misdemeanor' || bucket === 'felony' || bucket === 'cassation') return bucket;
    return resolveMergeEligibilityStage(record);
}

export function isTrialCaseStage(caseStage: CaseStage): boolean {
    return caseStage === 'misdemeanor' || caseStage === 'felony';
}

export function isTimelineNextDateInvalid(eventDate: string, nextDate: string): boolean {
    const ev = String(eventDate ?? '').trim();
    const next = String(nextDate ?? '').trim();
    if (!ev || !next) return false;
    return next < ev;
}

export function isInvestigationReferralCategory(category: string): boolean {
    return String(category ?? '').trim() === 'قرار إحالة إلى محكمة الموضوع';
}

export function isInvestigationCassationAppealCategory(category: string): boolean {
    return String(category ?? '').trim() === 'تقديم طعن تمييزي على قرار قاضي التحقيق';
}

export function normalizeLegacyCriminalStage(stage: string, _crimeType?: CrimeType | ''): CriminalCaseStage | '' {
    const raw = String(stage ?? '').trim();
    if (!raw) return '';
    return isValidCriminalStage(raw) ? raw : '';
}

export function mapLegacyJuvenileCourtNameToAdultStage(
    courtName: string,
    crimeType?: CrimeType | '',
): CriminalCaseStage {
    const raw = String(courtName ?? '').trim();
    if (raw !== 'محكمة الأحداث') return 'محكمة الجنح';
    return crimeType === 'جناية' ? 'محكمة الجنايات' : 'محكمة الجنح';
}

export type CriminalProceduralKey =
    | 'investigation'
    | 'juvenile_investigation'
    | 'juvenile_trial'
    | 'misdemeanor'
    | 'felony'
    | 'cassation';

export function stageToProceduralKey(stage: string): CriminalProceduralKey | null {
    if (stage === 'مرحلة التحقيق') return 'investigation';
    if (stage === 'تحقيق الأحداث') return 'juvenile_investigation';
    if (stage === 'محكمة الأحداث') return 'juvenile_trial';
    if (stage === 'محكمة الجنح') return 'misdemeanor';
    if (stage === 'محكمة الجنايات') return 'felony';
    if (stage === 'cassation_court') return 'cassation';
    return null;
}

export function isValidCriminalStage(v: string): v is CriminalCaseStage {
    return (
        v === 'مرحلة التحقيق' ||
        v === 'تحقيق الأحداث' ||
        v === 'محكمة الأحداث' ||
        v === 'محكمة الجنح' ||
        v === 'محكمة الجنايات' ||
        v === 'cassation_court'
    );
}

export function isJuvenileOnlyDefendantScope(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    scopedDefendantIds?: string[],
): boolean {
    const ids = (scopedDefendantIds ?? []).map((x) => String(x ?? '').trim()).filter(Boolean);
    const pool = ids.length ? defendants.filter((d) => ids.includes(d.id)) : defendants;
    return pool.length > 0 && pool.every((d) => d.isJuvenile === true);
}

export function shouldUseJuvenileTrialJourneyLabels(
    defendants: Pick<CriminalDefendant, 'id' | 'isJuvenile'>[],
    context?: { defendantIds?: string[]; storedStage?: string },
): boolean {
    const stored = String(context?.storedStage ?? '').trim();
    if (stored === 'محكمة الأحداث') return true;
    return isJuvenileOnlyDefendantScope(defendants, context?.defendantIds);
}
