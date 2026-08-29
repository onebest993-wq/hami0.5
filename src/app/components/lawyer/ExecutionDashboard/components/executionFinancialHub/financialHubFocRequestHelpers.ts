export function resolveHubMonthlyAlimony(args: {
    executionData: {
        monthlyAlimony?: number;
        alimony?: { calculated?: { monthlyOngoing?: number } };
        alimony_beneficiary_death?: unknown;
    } | null | undefined;
    monthlyAlimony: number;
}): number {
    const death = (args.executionData as { alimony_beneficiary_death?: unknown } | null | undefined)
        ?.alimony_beneficiary_death;
    const hasDeathReport = Boolean(
        (death as { wife_deceased?: boolean } | undefined)?.wife_deceased ||
            Number((death as { children_deceased_count?: number } | undefined)?.children_deceased_count) >
                0,
    );
    const persisted = Number(args.executionData?.monthlyAlimony ?? 0) || 0;
    if (hasDeathReport && persisted > 0) return persisted;
    const calculated = args.executionData?.alimony?.calculated as { monthlyOngoing?: number } | undefined;
    return persisted || Number(calculated?.monthlyOngoing ?? 0) || args.monthlyAlimony;
}

export function runFinancialHubGuarantorRequest(args: {
    onOpenGuarantorFollowupDetails?: () => void;
    guarantorFollowupAwaitingDetailsSave: (followup: unknown) => boolean;
    guarantorFollowup: unknown;
    setShowUnifiedExecutionModal?: (open: boolean) => void;
    setExecutionDebtorTabIndex?: (index: number) => void;
    primaryDebtorWorkspaceKey?: string | null;
    expandDebtor?: (key: string) => void;
    openGuarantorDetailsModal?: () => void;
    appendGuarantorFollowupRequest: (input: { executionId: string }) => {
        ok: boolean;
        decisionId?: string;
    };
    decisionsStorageExecutionId: string;
    showToast: (message: string, type?: string, opts?: { decisionsLink?: boolean }) => void;
    setTimelineEvents: (update: (prev: unknown[]) => unknown[]) => void;
    nextTimelineId: () => string;
    timelineDebtorMetadata: (key: unknown) => Record<string, unknown>;
    assignmentWorkspaceActiveDebtorKey: unknown;
}): void {
    if (args.onOpenGuarantorFollowupDetails) {
        args.onOpenGuarantorFollowupDetails();
        return;
    }
    if (args.guarantorFollowupAwaitingDetailsSave(args.guarantorFollowup)) {
        args.setShowUnifiedExecutionModal?.(false);
        args.setExecutionDebtorTabIndex?.(0);
        if (args.primaryDebtorWorkspaceKey) {
            args.expandDebtor?.(args.primaryDebtorWorkspaceKey);
        }
        args.openGuarantorDetailsModal?.();
        return;
    }
    const gReq = args.appendGuarantorFollowupRequest({
        executionId: args.decisionsStorageExecutionId,
    });
    if (!gReq.ok) {
        args.showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
            decisionsLink: true,
        });
        return;
    }
    if (gReq.decisionId) {
        const ts = new Date().toISOString();
        args.setTimelineEvents((prev) => [
            {
                id: args.nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'طلب إدخال كفيل ضامن — قيد البت',
                type: 'decision',
                source: 'القرارات والطعون',
                metadata: {
                    ...args.timelineDebtorMetadata(args.assignmentWorkspaceActiveDebtorKey),
                    timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                    decisionRowId: gReq.decisionId,
                },
            },
            ...prev,
        ]);
    }
    args.showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
        decisionsLink: true,
    });
}
