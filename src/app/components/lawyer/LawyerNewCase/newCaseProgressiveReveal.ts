import { isFixedFeeType } from './validation';
import { parseLawsuitClaimValueAmount } from '@/app/domain/lawsuit/lawsuitStageOptions';

export function hasFilledNewCaseText(value: string | undefined): boolean {
    return String(value ?? '').trim().length > 0;
}

export function hasLawsuitClaimValueBasis(input: {
    claimValue: string;
    isUndeterminedValue: boolean;
    isFixedFee: boolean;
    caseType: string;
}): boolean {
    if (input.isUndeterminedValue || input.isFixedFee) return true;
    if (isFixedFeeType(input.caseType)) return true;
    return parseLawsuitClaimValueAmount(input.claimValue) > 0;
}

export type NewCaseFieldUnlock = {
    type: boolean;
    value: boolean;
    stage: boolean;
    court: boolean;
    judgeDate: boolean;
    parties: boolean;
};

export const LOCKED_NEW_CASE_UNLOCK: NewCaseFieldUnlock = {
    type: true,
    value: true,
    stage: true,
    court: true,
    judgeDate: true,
    parties: true,
};

export const INITIAL_NEW_CASE_UNLOCK: NewCaseFieldUnlock = {
    type: false,
    value: false,
    stage: false,
    court: false,
    judgeDate: false,
    parties: false,
};

export type NewCaseProgressiveReveal = {
    showType: boolean;
    showValue: boolean;
    showStage: boolean;
    showCourt: boolean;
    showJudgeAndDate: boolean;
    showParties: boolean;
};

/** يظهر الحقل التالي فقط بعد تأكيد الخطوة (Enter / اختيار) — لا أثناء الكتابة. */
export function computeNewCaseProgressiveReveal(input: {
    lockParentFields?: boolean;
    unlock: NewCaseFieldUnlock;
}): NewCaseProgressiveReveal {
    if (input.lockParentFields) {
        return {
            showType: true,
            showValue: true,
            showStage: true,
            showCourt: true,
            showJudgeAndDate: true,
            showParties: true,
        };
    }
    const { unlock } = input;
    return {
        showType: unlock.type,
        showValue: unlock.value,
        showStage: unlock.stage,
        showCourt: unlock.court,
        showJudgeAndDate: unlock.judgeDate,
        showParties: unlock.parties,
    };
}
