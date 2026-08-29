import React from 'react';
import type { ExecutionCoerciveActionsModalContainerProps } from './ExecutionCoerciveActionsModalContainer.types';

export type CoerciveBranchSharedProps = Pick<
    ExecutionCoerciveActionsModalContainerProps,
    | 'activeDebtorIsEmployee'
    | 'executionCoerciveButtonDisabled'
    | 'daysSinceNoticeCalculated'
    | 'remaining'
    | 'handleCoerciveAction'
> & {
    closeCoerciveModal: () => void;
};
