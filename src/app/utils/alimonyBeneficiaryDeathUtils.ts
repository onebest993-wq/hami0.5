/**
 * Alimony beneficiary death utils — public barrel.
 * Import path `@/app/utils/alimonyBeneficiaryDeathUtils` is preserved for all consumers.
 */

export type {
    AlimonyBeneficiaryDeathState,
    AlimonyBeneficiaryKind,
    AlimonyBeneficiaryProfile,
    AlimonyBeneficiaryDeathInput,
    OngoingAlimonyMonthlyDisplay,
} from '@/app/utils/alimonyBeneficiaryDeathTypes';

export {
    readAlimonyBeneficiaryDeathState,
    resolveAlimonyBeneficiaryProfile,
} from '@/app/utils/alimonyBeneficiaryDeathProfile';

export {
    shouldCloseDossierAfterAllAlimonyBeneficiariesDeceased,
    buildAlimonyBeneficiaryDeathMerge,
} from '@/app/utils/alimonyBeneficiaryDeathMerge';

export {
    shouldSuppressOngoingAlimonyMonthlyUi,
    resolveOngoingAlimonyMonthlyDisplay,
    resolveSurvivorOngoingMonthlyAlimonyIqd,
    countAliveAlimonyBeneficiaries,
    shouldShowAlimonyBeneficiaryDeathPicker,
    buildSoleSurvivorDeathInput,
} from '@/app/utils/alimonyBeneficiaryDeathDisplay';
