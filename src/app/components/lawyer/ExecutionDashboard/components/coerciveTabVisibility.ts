export function computeShowNonEvictionProcedureBlock(input: {
    effectiveEvictionModule: boolean;
    showEncroachmentCards: boolean;
    encroachmentExecutionId: string;
    showSpecificDeliveryProceduresBlock: boolean;
    isMaritalFurnitureClaim: boolean;
}): boolean {
    if (input.effectiveEvictionModule) return false;
    if (input.showEncroachmentCards && input.encroachmentExecutionId) return true;
    if (input.showSpecificDeliveryProceduresBlock || input.isMaritalFurnitureClaim) return true;
    return false;
}

export function computeShowEmptyCoerciveHint(input: {
    effectiveEvictionModule: boolean;
    seizureToolsReady: boolean;
    hideCoerciveSeizureSalaryAndProperty: boolean;
    hideFollowupCoerciveTab: boolean;
    showNonEvictionProcedureBlock: boolean;
    gracePeriodEnded: boolean;
    coerciveUiLocked: boolean;
    hideCoerciveGraceNoticeBanner: boolean;
    executionStatus: string;
    debtorAttendedVoluntarily: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    hideCoerciveFinancialBanners: boolean;
    isSpecificDeliveryModule: boolean;
    showSpecificDeliveryFieldProcedures: boolean;
    specificDeliveryFinancialized: boolean;
}): boolean {
    if (input.effectiveEvictionModule) return false;
    if (input.seizureToolsReady && !input.hideCoerciveSeizureSalaryAndProperty && !input.hideFollowupCoerciveTab) {
        return false;
    }
    if (input.showNonEvictionProcedureBlock) return false;
    if (
        !input.gracePeriodEnded &&
        !input.coerciveUiLocked &&
        !input.hideCoerciveGraceNoticeBanner
    ) {
        return false;
    }
    if (
        (input.executionStatus === 'GRACE_PERIOD' || input.executionStatus === 'READY_FOR_COERCIVE') &&
        !input.debtorAttendedVoluntarily &&
        !input.lawyerStartedPostNoticeExecution &&
        !input.coerciveUiLocked
    ) {
        return false;
    }
    if (input.coerciveUiLocked) return false;
    if (input.followupEmployeeFinancialSalaryOnlyCoercive && !input.hideCoerciveFinancialBanners) {
        return false;
    }
    if (
        input.isSpecificDeliveryModule &&
        !input.showSpecificDeliveryFieldProcedures &&
        !input.specificDeliveryFinancialized
    ) {
        return false;
    }
    return true;
}
