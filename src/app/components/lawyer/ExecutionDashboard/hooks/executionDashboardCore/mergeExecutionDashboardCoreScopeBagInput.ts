// @ts-nocheck
/** Auto-generated — دمج مجموعات scope bag input (Slice 15+) */
import type { ExecutionDashboardCoreScopeBagInput } from './buildExecutionDashboardCoreScopeBags';

export type ExecutionDashboardCoreScopeBagGroups = {
    handlers: Record<string, unknown>;
    setters: Record<string, unknown>;
    flags: Record<string, unknown>;
    execution: Record<string, unknown>;
    followupUi: Record<string, unknown>;
    eviction: Record<string, unknown>;
    financial: Record<string, unknown>;
    timelineDossier: Record<string, unknown>;
    misc: Record<string, unknown>;
};

export function mergeExecutionDashboardCoreScopeBagInput(
    groups: ExecutionDashboardCoreScopeBagGroups,
): ExecutionDashboardCoreScopeBagInput {
    return {
        ...groups.handlers,
        ...groups.setters,
        ...groups.flags,
        ...groups.execution,
        ...groups.followupUi,
        ...groups.eviction,
        ...groups.financial,
        ...groups.timelineDossier,
        ...groups.misc,
    } as ExecutionDashboardCoreScopeBagInput;
}
