import React from 'react';
import { ExecutionCoerciveEmployeeSalaryOnlyBranch } from './ExecutionCoerciveEmployeeSalaryOnlyBranch';
import { ExecutionCoerciveMonetaryLimitedBranch } from './ExecutionCoerciveMonetaryLimitedBranch';
import { ExecutionCoerciveStandardBranch } from './ExecutionCoerciveStandardBranch';
import type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';

type ExecutionCoerciveActionsModalBodyProps = Pick<
    ExecutionCoerciveActionsModalContainerProps,
    | 'followupEmployeeFinancialSalaryOnlyCoercive'
    | 'followupMonetaryCoerciveLimitedOnly'
    | 'activeDebtorIsEmployee'
    | 'executionCoerciveButtonDisabled'
    | 'daysSinceNoticeCalculated'
    | 'remaining'
    | 'handleCoerciveAction'
    | 'isDebtorGovernmentEmployee'
    | 'isDebtorFreelancer'
    | 'isNonFinancialClaim'
    | 'showToast'
> & {
    closeCoerciveModal: () => void;
};

export const ExecutionCoerciveActionsModalBody: React.FC<ExecutionCoerciveActionsModalBodyProps> = ({
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    daysSinceNoticeCalculated,
    remaining,
    handleCoerciveAction,
    isDebtorGovernmentEmployee,
    isDebtorFreelancer,
    isNonFinancialClaim,
    showToast,
    closeCoerciveModal,
}) => (
    <div className="p-5 space-y-3">
        {followupEmployeeFinancialSalaryOnlyCoercive ? (
            <ExecutionCoerciveEmployeeSalaryOnlyBranch
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                remaining={remaining}
                handleCoerciveAction={handleCoerciveAction}
                closeCoerciveModal={closeCoerciveModal}
            />
        ) : followupMonetaryCoerciveLimitedOnly ? (
            <ExecutionCoerciveMonetaryLimitedBranch
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                remaining={remaining}
                handleCoerciveAction={handleCoerciveAction}
                closeCoerciveModal={closeCoerciveModal}
            />
        ) : (
            <ExecutionCoerciveStandardBranch
                activeDebtorIsEmployee={activeDebtorIsEmployee}
                daysSinceNoticeCalculated={daysSinceNoticeCalculated}
                remaining={remaining}
                handleCoerciveAction={handleCoerciveAction}
                closeCoerciveModal={closeCoerciveModal}
                executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                isDebtorGovernmentEmployee={isDebtorGovernmentEmployee}
                isDebtorFreelancer={isDebtorFreelancer}
                isNonFinancialClaim={isNonFinancialClaim}
                showToast={showToast}
            />
        )}
    </div>
);
