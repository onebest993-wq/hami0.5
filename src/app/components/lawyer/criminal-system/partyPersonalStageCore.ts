import type { DefendantPersonalStage } from '@/app/types/criminal';
import type { StageConclusion } from './criminalCaseModel';

const TERMINAL_PERSONAL_STAGES: DefendantPersonalStage[] = [
    'lawsuit_dropped_death',
    'lawsuit_dropped',
    'acquitted',
    'convicted',
    'released_temporary',
];

export function defaultPersonalStage(): DefendantPersonalStage {
    return 'under_investigation';
}

export function isTerminalPersonalStage(stage: DefendantPersonalStage | undefined): boolean {
    return TERMINAL_PERSONAL_STAGES.includes(stage ?? 'under_investigation');
}

export function personalStageForDecision(
    decisionType: StageConclusion['decisionType'],
    expirationReason?: StageConclusion['expirationReason'],
): DefendantPersonalStage | null {
    if (decisionType === 'referral') return 'referred_to_trial';
    if (decisionType === 'conviction') return 'convicted';
    if (decisionType === 'acquittal') return 'acquitted';
    if (decisionType === 'release' || decisionType === 'temporary_release_insufficient_evidence') {
        return 'released_temporary';
    }
    if (decisionType === 'cassation_quash_acquit_release') return 'acquitted';
    if (decisionType === 'expiration') {
        if (expirationReason === 'death') return 'lawsuit_dropped_death';
        if (expirationReason === 'statute_of_limitations') return 'lawsuit_dropped';
        return 'released_temporary';
    }
    if (decisionType === 'return_investigation_deficiency' || decisionType === 'cassation_quash_investigation') {
        return 'under_investigation';
    }
    if (
        decisionType === 'misdemeanor_to_felony_jurisdiction' ||
        decisionType === 'felony_to_misdemeanor_jurisdiction' ||
        decisionType === 'trial_cassation_appeal' ||
        decisionType === 'cassation_quash_remand' ||
        decisionType === 'cassation_quash_trial_misdemeanor' ||
        decisionType === 'cassation_quash_trial_felony'
    ) {
        return 'referred_to_trial';
    }
    return null;
}
