// @ts-nocheck
/** Phase C Slice 23 — تجميع local bundle input من مجموعات */
export function collectScopeLocalBundleInput(g: {
    timeline: Record<string, unknown>;
    execution: Record<string, unknown>;
    seizure: Record<string, unknown>;
    notes: Record<string, unknown>;
    financial: Record<string, unknown>;
}) {
    return {
        ...g.timeline,
        ...g.execution,
        ...g.seizure,
        ...g.notes,
        ...g.financial,
    };
}
