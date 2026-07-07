// @ts-nocheck
/** Gate lazy load of execution-core-handlers chunk */
export type ExecutionHandlerClusterGateInput = {
    showUnifiedExecutionModal: boolean;
    unifiedModalTab?: string | null;
    showUnifiedSeizureLogModal: boolean;
    showCoerciveModal: boolean;
    showAppointmentModal: boolean;
    showSeizedAssetsModal: boolean;
    showPaymentModal: boolean;
    showNotesModal: boolean;
    showCoerciveActionForm: boolean;
    showEditDossierMetaModal: boolean;
    dossierLifecyclePanelOpen: boolean;
    isHeaderExpanded: boolean;
};

export type ExecutionHandlerClusterHeavyMode = 'none' | 'followup' | 'seizure' | 'coercive';
export type ExecutionHandlerClusterFollowupMode =
    | 'none'
    | 'admin-special'
    | 'dossier-controls'
    | 'other-party';
export type ExecutionHandlerClusterSeizureMode = 'none' | 'requests' | 'log';

export function shouldLoadExecutionHandlerClusterLight(input: ExecutionHandlerClusterGateInput): boolean {
    return Boolean(input.showAppointmentModal || input.showPaymentModal || input.showNotesModal);
}

export function shouldLoadExecutionHandlerClusterHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) !== 'none';
}

export function shouldLoadExecutionHandlerClusterFollowupHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) === 'followup';
}

export function shouldLoadExecutionHandlerClusterFollowupAdminSpecial(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    return resolveExecutionHandlerClusterFollowupMode(input) === 'admin-special';
}

export function shouldLoadExecutionHandlerClusterFollowupControlsOtherParty(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    const mode = resolveExecutionHandlerClusterFollowupMode(input);
    return mode === 'dossier-controls' || mode === 'other-party';
}

export function shouldLoadExecutionHandlerClusterFollowupDossierControls(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    return resolveExecutionHandlerClusterFollowupMode(input) === 'dossier-controls';
}

export function shouldLoadExecutionHandlerClusterFollowupOtherParty(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    return resolveExecutionHandlerClusterFollowupMode(input) === 'other-party';
}

export function shouldLoadExecutionHandlerClusterSeizureHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) !== 'none';
}

export function shouldLoadExecutionHandlerClusterSeizureRequests(
    input: ExecutionHandlerClusterGateInput,
): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) === 'requests';
}

export function shouldLoadExecutionHandlerClusterSeizureLog(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterSeizureMode(input) === 'log';
}

export function shouldLoadExecutionHandlerClusterCoerciveHeavy(input: ExecutionHandlerClusterGateInput): boolean {
    return resolveExecutionHandlerClusterHeavyMode(input) === 'coercive';
}

export function shouldLoadExecutionHandlerClusterDossierSupport(input: ExecutionHandlerClusterGateInput): boolean {
    return Boolean(input.showEditDossierMetaModal || input.dossierLifecyclePanelOpen || input.isHeaderExpanded);
}

export function resolveExecutionHandlerClusterFollowupMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterFollowupMode {
    if (resolveExecutionHandlerClusterHeavyMode(input) !== 'followup') {
        return 'none';
    }

    const activeFollowupTab = String(input.unifiedModalTab || '').trim();
    if (activeFollowupTab === 'admin' || activeFollowupTab === 'special') {
        return 'admin-special';
    }

    if (activeFollowupTab === 'dossier_controls') {
        return 'dossier-controls';
    }

    if (activeFollowupTab === 'other_party') {
        return 'other-party';
    }

    return 'none';
}

export function resolveExecutionHandlerClusterHeavyMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterHeavyMode {
    if (input.showCoerciveModal || input.showCoerciveActionForm) {
        return 'coercive';
    }

    if (resolveExecutionHandlerClusterSeizureMode(input) !== 'none') {
        return 'seizure';
    }

    if (!input.showUnifiedExecutionModal) {
        return 'none';
    }

    const activeFollowupTab = String(input.unifiedModalTab || '').trim();

    if (!activeFollowupTab || activeFollowupTab === 'seizure_requests') {
        return 'seizure';
    }

    if (activeFollowupTab === 'coercive') {
        return 'coercive';
    }

    if (
        activeFollowupTab === 'dossier_controls' ||
        activeFollowupTab === 'other_party'
    ) {
        return 'followup';
    }

    if (activeFollowupTab === 'admin') {
        return 'followup';
    }

    if (activeFollowupTab === 'correspondences') {
        return 'none';
    }

    return 'none';
}

export function resolveExecutionHandlerClusterSeizureMode(
    input: ExecutionHandlerClusterGateInput,
): ExecutionHandlerClusterSeizureMode {
    if (input.showUnifiedSeizureLogModal) {
        return 'log';
    }

    if (!input.showUnifiedExecutionModal) {
        return 'none';
    }

    const activeFollowupTab = String(input.unifiedModalTab || '').trim();
    if (!activeFollowupTab || activeFollowupTab === 'seizure_requests') {
        return 'requests';
    }

    return 'none';
}

export function shouldLoadExecutionHandlerCluster(input: ExecutionHandlerClusterGateInput): boolean {
    return shouldLoadExecutionHandlerClusterLight(input) || shouldLoadExecutionHandlerClusterHeavy(input);
}

export function buildExecutionHandlerClusterMountKey(p: {
    executionId: string | undefined;
    activeTabId: string;
    decisionsReloadEpoch: number;
    activeFollowupDebtorKey: string | undefined;
}): string {
    return [
        p.executionId ?? '',
        p.activeFollowupDebtorKey ?? '',
    ].join(':');
}
