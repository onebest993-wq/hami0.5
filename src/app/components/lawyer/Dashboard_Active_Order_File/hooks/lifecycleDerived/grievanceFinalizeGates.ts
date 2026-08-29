type ComputeGrievancePhase2FinalizeReadyArgs = {
    isFinalized: boolean;
    grievanceOutcome: string | null | undefined;
    grievanceExpiredCanClose: boolean;
    grievanceExpiredConfirmed: boolean;
    grievanceFinalSaveReady: boolean;
};

export function computeGrievancePhase2FinalizeReady(args: ComputeGrievancePhase2FinalizeReadyArgs): boolean {
    const {
        isFinalized,
        grievanceOutcome,
        grievanceExpiredCanClose,
        grievanceExpiredConfirmed,
        grievanceFinalSaveReady,
    } = args;

    if (isFinalized) return false;
    if (grievanceOutcome === 'expired') {
        if (!grievanceExpiredCanClose) return false;
        return grievanceExpiredConfirmed;
    }
    if (grievanceOutcome === 'filed') {
        if (!grievanceFinalSaveReady) return false;
        return true;
    }
    return false;
}
