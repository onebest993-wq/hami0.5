import React from 'react';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from '../components/ExecutionDashboardStatusViews';
import { useExecutionDashboardCore } from './useExecutionDashboardCore';
import type { ExecutionDashboardProps } from '../types';
import { ExecutionDashboardResolvedRuntimeSurface } from './ExecutionDashboardResolvedRuntimeSurface';

export const ExecutionDashboardViewResolved = React.memo(function ExecutionDashboardViewResolved({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps) {
    const vm = useExecutionDashboardCore({ file, executionId, onClose, onUpdate });

    if (vm.isLoading) {
        return <ExecutionDashboardLoadingView />;
    }

    if (vm.loadError || !vm.executionData) {
        return (
            <ExecutionDashboardErrorView
                message={vm.loadError || 'لم يتم العثور على بيانات التنفيذ'}
                onClose={vm.onClose}
            />
        );
    }

    return <ExecutionDashboardResolvedRuntimeSurface vm={vm} />;
});
