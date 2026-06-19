export function resolveSmartFileParentCaseNo(parentData: Record<string, unknown>): string | undefined {
    return typeof parentData?.caseNo === 'string' ? parentData.caseNo : undefined;
}

export function resolveSmartFileParentCourt(parentData: Record<string, unknown>): string | undefined {
    return typeof parentData?.court === 'string' ? parentData.court : undefined;
}

export function resolveSmartFileClientName(parentData: Record<string, unknown>): string | undefined {
    const parties = parentData?.parties;
    if (
        Array.isArray(parties) &&
        parties[0] &&
        typeof parties[0] === 'object' &&
        typeof (parties[0] as { name?: string }).name === 'string'
    ) {
        return (parties[0] as { name: string }).name;
    }
    return undefined;
}
