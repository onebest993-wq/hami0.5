export interface ExecutionCoerciveActionsModalContainerProps {
    showCoerciveModal: boolean;
    setShowCoerciveModal?: (show: boolean) => void;
    onCloseCoerciveModal?: () => void;
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    followupMonetaryCoerciveLimitedOnly: boolean;
    activeDebtorIsEmployee: boolean;
    executionCoerciveButtonDisabled: boolean;
    daysSinceNoticeCalculated: number;
    remaining: number;
    handleCoerciveAction: (actionType: string) => void;
    isDebtorGovernmentEmployee: boolean;
    isDebtorFreelancer: boolean;
    isNonFinancialClaim: boolean;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}
