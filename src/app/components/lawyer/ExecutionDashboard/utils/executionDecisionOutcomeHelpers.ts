export type ExecutionDecisionOutcomeDetail = {
    executionId?: string;
    requestKind?: string;
    outcome?: string;
    decisionId?: string;
};

export function matchesExecutionOutcomeEvent(
    detail: ExecutionDecisionOutcomeDetail | undefined,
    myExecutionId: string
): boolean {
    const evId = String(detail?.executionId ?? '');
    const myId = String(myExecutionId || '').trim();
    return Boolean(myId && evId && evId === myId);
}
