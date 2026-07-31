/**
 * Pure case transforms for CriminalCase — personal-stage propagation across
 * defendants, driven directly or by a StageConclusion. None of these touch
 * the Zustand store directly.
 */
import {
    normalizeDefendantPersonalFields,
} from './criminalStorePersistSupport';
import type {
    DefendantPersonalStage,
} from '@/app/types/criminal';
import type {
    CriminalCase,
    CriminalDefendant,
    DefendantStatus,
    StageConclusion,
} from './criminalCaseModel';
import {
    resolvePersonalBeneficiaryIds,
} from './cassationEngine';
import {
    resolvePersonalStageTargets,
} from './criminalCaseGovernance';
import {
    defaultPersonalStage,
    isTerminalPersonalStage,
    personalStageForDecision,
} from './partyPersonalStageCore';
import {
    mapDecisionStatusToDefendantStatus,
} from './caseTransformShared';

export function applyPersonalStagesToDefendants(
    caseRecord: CriminalCase,
    defendantIds: string[],
    personalStage: DefendantPersonalStage,
    patch?: Partial<Pick<CriminalDefendant, 'status' | 'isPartyRecordLocked'>>,
): CriminalCase {
    const idSet = new Set(
        (Array.isArray(defendantIds) ? defendantIds : []).map((x) => String(x ?? '').trim()).filter(Boolean),
    );
    if (!idSet.size) return caseRecord;
    const nextDefendants = (Array.isArray(caseRecord.defendants) ? caseRecord.defendants : []).map((d) => {
        if (!idSet.has(d.id)) return normalizeDefendantPersonalFields(d);
        return normalizeDefendantPersonalFields({
            ...d,
            personalStage,
            ...patch,
        });
    });
    return { ...caseRecord, defendants: nextDefendants };
}

export function applyPersonalStagesFromConclusion(caseRecord: CriminalCase, conclusion: StageConclusion): CriminalCase {
    const quashTypes = new Set([
        'cassation_quash_remand',
        'cassation_quash_acquit_release',
        'cassation_quash_investigation',
        'cassation_quash_trial_misdemeanor',
        'cassation_quash_trial_felony',
    ]);
    let ids: string[];
    if (quashTypes.has(conclusion.decisionType)) {
        ids = resolvePersonalBeneficiaryIds(
            caseRecord,
            conclusion.sharedObjectiveGrounds269b === true,
            conclusion.targetDefendantIds ?? conclusion.defendantIds,
        );
    } else {
        ids = resolvePersonalStageTargets(caseRecord, conclusion);
    }
    if (!ids.length) return caseRecord;
    const ps = personalStageForDecision(conclusion.decisionType, conclusion.expirationReason);
    if (!ps) return caseRecord;
    const statusPatch =
        ps === 'lawsuit_dropped_death'
            ? ({ status: 'متوفى' as DefendantStatus, isPartyRecordLocked: true } as const)
            : conclusion.decisionType === 'conviction' ||
                conclusion.decisionType === 'acquittal' ||
                conclusion.decisionType === 'release'
              ? ({ status: mapDecisionStatusToDefendantStatus(conclusion.defendantStatusAtDecision) } as const)
              : undefined;
    return applyPersonalStagesToDefendants(caseRecord, ids, ps, statusPatch);
}

export function allDefendantsTerminal(defendants: CriminalDefendant[]): boolean {
    const list = Array.isArray(defendants) ? defendants : [];
    if (!list.length) return false;
    return list.every((d) => isTerminalPersonalStage(d.personalStage ?? defaultPersonalStage()));
}
