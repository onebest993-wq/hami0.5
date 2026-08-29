import type { CaseStage, JourneyNode } from '@/app/types/criminal';
import { getCurrentJourneyNode, repairSameCourtRemandJourneyNodes } from './stageJourney';
import type { CriminalCaseStage } from './criminalCaseModel';
import {
    isInvestigationStoredStage,
    stageToProceduralKey,
} from './criminalProceduralStageUtils';

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

/** مزامنة الرحلة — يحافظ على مراحل الأحداث المخزنة ولا يُعيدها لمسار بالغ افتراضياً. */
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

/** المرحلة التشغيلية الحالية — كما يراها المحامي (إعادة فتح التحقيق، مسار الرحلة، ثم السجل). */
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

/**
 * مرحلة أهلية الضم — تُطابق «خزانة الأضابير» ومرحلة التحقيق الفعّالة،
 * لا مجرد caseStage القديم أو عقدة رحلة عالقة بعد إعادة التحقيق.
 */
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

    // يُطابق CriminalDashboard: isInvestigationPhase = (resolveCaseStageFromRecord === 'investigation')
    const fromRecord = resolveCaseStageFromRecord(record);
    if (fromRecord === 'investigation') {
        return 'investigation';
    }

    const stored = String(record.basics?.stage ?? '').trim();
    const investigationLocked = record.isInvestigationLocked === true;
    const journeyRaw = Array.isArray(record.stageJourney) ? record.stageJourney : [];

    // عقدة تحقيق «current» صريحة — قبل repair الذي قد يُعيد تفعيل محكمة قديمة.
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

/** مرحلة تحقيق كما في اللوحة أو في خزانة الأضابير — مرحلة مخزنة أو محكمة/رقم تحقيق. */
export function isInvestigationMergeBucket(
    record:
        | {
              caseStage?: CaseStage;
              basics?: { stage?: string };
              location?: {
                  investigationCourtName?: string;
                  investigationDossierNumber?: string;
                  baseRegisterNumberAndDate?: string;
              };
          }
        | undefined,
): boolean {
    if (!record) return false;
    if (resolveCaseStageFromRecord(record) === 'investigation') return true;
    if (isInvestigationStoredStage(String(record.basics?.stage ?? ''))) return true;
    const loc = record.location ?? {};
    if (String(loc.investigationCourtName ?? '').trim()) return true;
    if (String(loc.investigationDossierNumber ?? '').trim()) return true;
    if (String(loc.baseRegisterNumberAndDate ?? '').trim()) return true;
    return false;
}

/**
 * سِلّة المرحلة للضم — من `basics.stage` في الخزانة (محكمة الأحداث/تحقيق الأحداث منفصلان عن البالغين).
 */
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
    if (fromRecord === 'investigation') return 'investigation';
    return 'investigation';
}

/**
 * مرحلة المقارنة عند الضم — تُطابق عرض الخزانة واللوحة، لا مسار الرحلة وحده.
 */
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
