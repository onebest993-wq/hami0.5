// @ts-nocheck
/** Gate lazy load of execution-core-handlers chunk */
export type ExecutionHandlerClusterGateInput = {
    showUnifiedExecutionModal: boolean;
    showUnifiedSeizureLogModal: boolean;
    showCoerciveModal: boolean;
    showAppointmentModal: boolean;
    showSeizedAssetsModal: boolean;
    showPaymentModal: boolean;
    showNotesModal: boolean;
    showCoerciveActionForm: boolean;
};

export function shouldLoadExecutionHandlerCluster(input: ExecutionHandlerClusterGateInput): boolean {
    return Boolean(
        input.showUnifiedExecutionModal ||
            input.showUnifiedSeizureLogModal ||
            input.showCoerciveModal ||
            input.showAppointmentModal ||
            input.showSeizedAssetsModal ||
            input.showPaymentModal ||
            input.showNotesModal ||
            input.showCoerciveActionForm,
    );
}

export function buildExecutionHandlerClusterMountKey(p: {
    executionId: string | undefined;
    activeTabId: string;
    decisionsReloadEpoch: number;
    activeFollowupDebtorKey: string | undefined;
}): string {
    return [
        p.executionId ?? '',
        p.activeTabId,
        String(p.decisionsReloadEpoch),
        p.activeFollowupDebtorKey ?? '',
    ].join(':');
}
