import type { ExecutionDashboardState } from './types';

export type DashboardStoreSet = (
    partial:
        | Partial<ExecutionDashboardState>
        | ((state: ExecutionDashboardState) => Partial<ExecutionDashboardState> | ExecutionDashboardState),
) => void;

export type DashboardStoreGet = () => ExecutionDashboardState;
