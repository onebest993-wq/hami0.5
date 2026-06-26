// @ts-nocheck
/** Orchestrator رفيع — يحمّل useExecutionDashboardView في chunk منفصل */
import React from 'react';
import { ExecutionDashboardView } from './ExecutionDashboard/hooks/useExecutionDashboardView';
import type { ExecutionDashboardProps } from './ExecutionDashboard/types';

export const ExecutionDashboard = React.memo(function ExecutionDashboard(props: ExecutionDashboardProps) {
    return <ExecutionDashboardView {...props} />;
});
