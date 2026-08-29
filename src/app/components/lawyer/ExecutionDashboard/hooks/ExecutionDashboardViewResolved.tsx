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
    onExitToHome,
}: ExecutionDashboardProps) {
    const vm = useExecutionDashboardCore({ file, executionId, onClose, onUpdate });
    const exitToHome = onExitToHome ?? onClose;

    if (vm.isLoading) {
        return <ExecutionDashboardLoadingView file={file} onExitToHome={exitToHome} />;
    }

    if (vm.loadError || !vm.executionData) {
        return (
            <ExecutionDashboardErrorView
                message={vm.loadError || 'لم يتم العثور على بيانات التنفيذ'}
                onClose={vm.onClose}
            />
        );
    }

    return (
        <ExecutionDashboardResolvedRuntimeSurface
            vm={vm}
            paintFile={file ?? vm.executionData}
            onExitToHome={exitToHome}
        />
    );
});
