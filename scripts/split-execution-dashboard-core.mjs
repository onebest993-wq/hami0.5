import fs from 'fs';

const viewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.tsx';
const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const lines = fs.readFileSync(viewPath, 'utf8').split(/\r?\n/);

const exportIdx = lines.findIndex((l) => l.startsWith('export const ExecutionDashboardView'));
if (exportIdx < 0) throw new Error('export not found');
const renderIdx = lines.findIndex((l) => l.includes('CONDITIONAL RENDERING'));
if (renderIdx < 0) throw new Error('render marker not found');

let importBlock = lines.slice(0, exportIdx).join('\n');
importBlock = importBlock
    .replace(/import \{ ExecutionDashboardRootFrame \}[^\n]+\n/, '')
    .replace(/import \{\s*ExecutionDashboardErrorView,\s*ExecutionDashboardLoadingView,\s*\}[^\n]+\n/, '')
    .replace(/import \{ ExecutionDashboardChunkHost \}[^\n]+\n/, '');

const bodyLines = lines.slice(exportIdx + 1, renderIdx);
while (bodyLines.length && bodyLines[0].trim() === '') bodyLines.shift();

const coreTail = `
    return {
        isLoading,
        loadError,
        executionData,
        viewExecutionData,
        onClose,
        toastVisible,
        toastMessage,
        toastType,
        toastEpoch,
        hideToast,
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
        showUnifiedExecutionModal,
    };
}`;

const coreFile = `// @ts-nocheck
/** منطق ExecutionDashboard — chunk execution-hooks */
${importBlock}
import type { ExecutionDashboardProps } from '../types';

export function useExecutionDashboardCore({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps) {
${bodyLines.join('\n')}
${coreTail}
`;

const thinView = `// @ts-nocheck
/** عرض رفيع — chunk execution-dashboard-state */
import React from 'react';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { ExecutionToast } from '../components/ExecutionToast';
import { ExecutionDashboardChunkHost } from '../components/ExecutionDashboardChunkHost';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from '../components/ExecutionDashboardStatusViews';
import { ExecutionDashboardRootFrame } from '../components/ExecutionDashboardRootFrame';
import { useExecutionDashboardCore } from './useExecutionDashboardCore';
import type { ExecutionDashboardProps } from '../types';

export const ExecutionDashboardView = React.memo(function ExecutionDashboardView({
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

    return (
        <ColleagueConsultationProvider source={extractExecutionShareSource(vm.viewExecutionData)}>
            <ExecutionDashboardRootFrame>
                <ExecutionToast
                    visible={vm.toastVisible}
                    message={vm.toastMessage}
                    type={vm.toastType}
                    epoch={vm.toastEpoch}
                    onClose={vm.hideToast}
                    zIndex={EXEC_MODAL_Z.toastAboveExecution}
                />
                <ExecutionDashboardChunkHost
                    phoneBodyReady={vm.phoneBodyReady}
                    shellOverlaysReady={vm.shellOverlaysReady}
                    chunkScopeRef={vm.chunkScopeRef}
                    phoneBodyFingerprint={vm.phoneBodyFingerprint}
                    showUnifiedExecutionModal={vm.showUnifiedExecutionModal}
                />
            </ExecutionDashboardRootFrame>
        </ColleagueConsultationProvider>
    );
});
`;

fs.writeFileSync(corePath, coreFile);
fs.writeFileSync(viewPath, thinView);
console.log('[split-execution-dashboard-core]', {
    coreLines: coreFile.split('\n').length,
    viewLines: thinView.split('\n').length,
});
