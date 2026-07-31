export function pickExecutionDashboardScopeBagValues(
    input: Record<string, unknown>,
    keys: readonly string[],
): Record<string, unknown> {
    const picked: Record<string, unknown> = {};
    for (const key of keys) {
        picked[key] = input[key];
    }
    return picked;
}
