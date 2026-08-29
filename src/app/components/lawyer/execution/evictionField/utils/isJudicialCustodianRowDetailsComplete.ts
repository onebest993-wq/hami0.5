export function isJudicialCustodianRowDetailsComplete(
    row: Record<string, unknown>,
    custodians: Array<{ fullName: string; decisionId?: string; salary?: string }>,
): boolean {
    if (
        String((row as { judicialCustodianDetailsSavedAt?: string }).judicialCustodianDetailsSavedAt || '')
            .trim()
    ) {
        return true;
    }
    const decisionId = String((row as { id?: string }).id || '').trim();
    if (!decisionId) return false;
    return custodians.some(
        (c) =>
            String(c.decisionId || '').trim() === decisionId &&
            String(c.fullName || '').trim(),
    );
}
