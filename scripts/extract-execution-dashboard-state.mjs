import fs from 'fs';
import path from 'path';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const hookPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardState.ts';
const content = fs.readFileSync(dashPath, 'utf8');
const lines = content.split(/\r?\n/);

const importEnd = lines.findIndex((l) => l.startsWith('export const ExecutionDashboard'));
const bodyStart = lines.findIndex((l, i) => i > importEnd && l.includes('// EXECUTION DATA - MUST BE FIRST'));
const chunkEnd = lines.findIndex((l, i) => i > bodyStart && l.trim() === '});' && lines[i + 1]?.trim() === '' && lines[i - 1]?.trim() === '}),');
const renderStart = lines.findIndex((l) => l.trim() === '// ✅ CONDITIONAL RENDERING: Show loading/error states first');

if ([importEnd, bodyStart, chunkEnd, renderStart].some((i) => i < 0)) {
    console.error('markers', { importEnd, bodyStart, chunkEnd, renderStart });
    process.exit(1);
}

let importBlock = lines.slice(0, importEnd).join('\n');
importBlock = importBlock
    .replaceAll("from './ExecutionDashboard/hooks/", "from './")
    .replaceAll("from './ExecutionDashboard/components/", "from '../components/")
    .replaceAll("from './ExecutionDashboard/", "from '../")
    .replaceAll("from './ExecutionDashboard/types'", "from '../types'");

// Drop render-only imports from state hook
const dropImportPatterns = [
    /import \{ ExecutionDashboardChunkHost \}[^\n]+\n/,
    /import \{\s*ExecutionDashboardErrorView,\s*ExecutionDashboardLoadingView,\s*\}[^\n]+\n/,
    /import \{ useExecutionDashboardLazyChunkSetup \}[^\n]+\n/,
    /import \{ useExecutionDashboardBootPrefetch \}[^\n]+\n/,
];
for (const re of dropImportPatterns) {
    importBlock = importBlock.replace(re, '');
}

const hookImports = `import { useExecutionDashboardBootPrefetch } from './useExecutionDashboardBootPrefetch';
import { useExecutionDashboardLazyChunkSetup } from './useExecutionDashboardLazyChunkSetup';
import type { ExecutionDashboardProps } from '../types';
import type { MutableRefObject } from 'react';

export type ExecutionDashboardStateViewModel = {
    isLoading: boolean;
    loadError: string | null;
    executionData: unknown;
    viewExecutionData: unknown;
    onClose: () => void;
    toastVisible: boolean;
    toastMessage: string;
    toastType: string;
    toastEpoch: number;
    hideToast: () => void;
    phoneBodyFingerprint: string;
    phoneBodyReady: boolean;
    shellOverlaysReady: boolean;
    chunkScopeRef: MutableRefObject<Record<string, unknown>>;
    showUnifiedExecutionModal: boolean;
};

`;

const body = lines.slice(bodyStart, chunkEnd + 1).join('\n');

const hookFile = `// @ts-nocheck
/** منطق ExecutionDashboard — مستخرج من المكوّن الرئيسي */
${importBlock}

${hookImports}
export function useExecutionDashboardState({
    file,
    executionId,
    onClose,
    onUpdate,
}: ExecutionDashboardProps): ExecutionDashboardStateViewModel {
${body}

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
}
`;

fs.writeFileSync(hookPath, hookFile);

const thinDash = `// @ts-nocheck
import React from 'react';
import { ColleagueConsultationProvider } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { extractExecutionShareSource } from '@/app/services/caseShare/caseShareExtractors';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';
import { ExecutionToast } from './ExecutionDashboard/components/ExecutionToast';
import { ExecutionDashboardChunkHost } from './ExecutionDashboard/components/ExecutionDashboardChunkHost';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from './ExecutionDashboard/components/ExecutionDashboardStatusViews';
import { useExecutionDashboardState } from './ExecutionDashboard/hooks/useExecutionDashboardState';
import type { ExecutionDashboardProps } from './ExecutionDashboard/types';

export const ExecutionDashboard: React.FC<ExecutionDashboardProps> = React.memo(
    ({ file, executionId, onClose, onUpdate }) => {
        const vm = useExecutionDashboardState({ file, executionId, onClose, onUpdate });

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
                <div
                    className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 backdrop-blur-3xl z-[100] flex items-center justify-center p-0"
                    dir="rtl"
                >
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
                </div>
            </ColleagueConsultationProvider>
        );
    },
);
`;

fs.writeFileSync(dashPath, thinDash);

console.log('extracted useExecutionDashboardState', {
    hookLines: hookFile.split('\n').length,
    dashLines: thinDash.split('\n').length,
});
