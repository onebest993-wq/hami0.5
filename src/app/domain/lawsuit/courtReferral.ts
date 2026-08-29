type CourtReferralAcceptance = 'pending' | 'accepted' | 'rejected';

type CourtReferralStageFields = {
    court?: string;
    referredToCourt?: string;
    courtReferralDate?: string;
    courtReferralNotes?: string;
    previousCourtName?: string;
    courtReferralAcceptance?: CourtReferralAcceptance;
    courtReferralDecisionDate?: string;
};

type CourtReferralDisplay = {
    displayCourt: string;
    previousCourt: string | null;
    isPending: boolean;
    isAccepted: boolean;
    referredToCourt: string | null;
};

export type PendingCourtReferral = {
    referredToCourt: string;
    previousCourtName: string;
    transferDate: string;
    notes?: string;
};

function str(value: unknown): string {
    return String(value ?? '').trim();
}

export function inferCourtReferralAcceptance(
    stage: CourtReferralStageFields,
): CourtReferralAcceptance | undefined {
    const explicit = stage.courtReferralAcceptance;
    if (explicit) return explicit;
    const referred = str(stage.referredToCourt);
    if (!referred) return undefined;
    return 'pending';
}

export function resolveCourtReferralDisplay(stage: CourtReferralStageFields): CourtReferralDisplay {
    const referred = str(stage.referredToCourt);
    const storedCourt = str(stage.court);
    const acceptance = inferCourtReferralAcceptance(stage);
    const isRejected = acceptance === 'rejected';
    const isAccepted = acceptance === 'accepted' && Boolean(referred) && !isRejected;
    const isPending = acceptance === 'pending' && Boolean(referred);

    if (isAccepted) {
        const previousCourt = str(stage.previousCourtName) || storedCourt || null;
        return {
            displayCourt: referred,
            previousCourt,
            isPending: false,
            isAccepted: true,
            referredToCourt: referred,
        };
    }

    return {
        displayCourt: storedCourt,
        previousCourt: null,
        isPending,
        isAccepted: false,
        referredToCourt: isPending ? referred : null,
    };
}

export function readPendingCourtReferral(stage: CourtReferralStageFields): PendingCourtReferral | null {
    const referred = str(stage.referredToCourt);
    if (!referred) return null;
    if (inferCourtReferralAcceptance(stage) !== 'pending') return null;

    const previousCourtName = str(stage.previousCourtName) || str(stage.court);
    if (!previousCourtName) return null;

    return {
        referredToCourt: referred,
        previousCourtName,
        transferDate: str(stage.courtReferralDate) || '',
        notes: str(stage.courtReferralNotes) || undefined,
    };
}

export function hasBlockingCourtReferral(stage: CourtReferralStageFields): boolean {
    return readPendingCourtReferral(stage) !== null;
}

export function mergeDraftIntoPendingStage<T extends CourtReferralStageFields>(
    stage: T,
    draft: PendingCourtReferral,
): T {
    if (inferCourtReferralAcceptance(stage) === 'pending') {
        return stage;
    }
    return {
        ...stage,
        previousCourtName: draft.previousCourtName || str(stage.court),
        referredToCourt: draft.referredToCourt,
        courtReferralDate: draft.transferDate,
        courtReferralNotes: draft.notes,
        courtReferralAcceptance: 'pending',
    };
}
