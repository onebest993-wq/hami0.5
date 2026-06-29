import fs from 'fs';
import { execSync } from 'child_process';

function readText(path) {
    const buf = fs.readFileSync(path);
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        return buf.toString('utf16le');
    }
    return buf.toString('utf8');
}

function readGitDashboardSource() {
    return execSync('git show HEAD:src/app/components/lawyer/ExecutionDashboard.tsx', {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
    });
}

function writeText(path, content) {
    fs.writeFileSync(path, content, 'utf8');
}

/** يصلح regex الأرقام العربية/الفارسية بعد قراءة UTF-16 من git show */
function fixDigitNormalizeRegex(content) {
    return content
        .replace(
            /\.replace\(\/\[[^\]]+\]\/g, \(d\) => String\('[^']+'\.indexOf\(d\)\)\)\s*\n\s*\.replace\(\/\[[^\]]+\]\/g, \(d\) => String\('[^']+'\.indexOf\(d\)\)\)/g,
            `.replace(/[\\u0660-\\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
                    .replace(/[\\u06F0-\\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))`,
        );
}

const srcPath = '.tmp-restore-execution-dash.tsx';
const viewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.full.tsx';
const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const thinViewPath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardView.tsx';

let content = fs.existsSync(srcPath)
    ? readText(srcPath)
    : readGitDashboardSource();

// ملف .tmp من git show عبر PowerShell قد يكون UTF-16 مُفسَّداً — نفضّل git UTF-8
if (content.includes('╪¬┘à') || content.includes('Γ£à')) {
    console.warn('[restore] corrupted Arabic in source — using git show UTF-8');
    content = readGitDashboardSource();
}

content = content.replace(
    /export const ExecutionDashboard(?:: React\.FC<[^>]+>)? = React\.memo\(\(\{/,
    'export const ExecutionDashboardView = React.memo(({',
);

content = content
    .replaceAll("from './caseShare/", "from '@/app/components/lawyer/caseShare/")
    .replaceAll("from './ExecutionDashboard/hooks/", "from './")
    .replaceAll("from './ExecutionDashboard/components/", "from '../components/")
    .replaceAll("from './ExecutionDashboard/", "from '../")
    .replaceAll("from './ExecutionDashboard/types'", "from '../types'");

content = fixDigitNormalizeRegex(content);

const viewHeader = `// @ts-nocheck
/** منطق + عرض ExecutionDashboard — مؤقت للتقسيم */
`;

writeText(viewPath, viewHeader + content.replace(/^\/\/ @ts-nocheck\n/, ''));

// run split logic
const lines = readText(viewPath).split(/\r?\n/);
const exportIdx = lines.findIndex((l) => l.startsWith('export const ExecutionDashboardView'));
const renderIdx = lines.findIndex((l) => l.includes('CONDITIONAL RENDERING'));
if (exportIdx < 0 || renderIdx < 0) throw new Error('markers missing in restored view');

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
/** منطق ExecutionDashboard — chunk execution-dashboard-core */
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

writeText(corePath, coreFile);
writeText(thinViewPath, thinView);
fs.unlinkSync(viewPath);

console.log('[restore-execution-dashboard-core]', {
    coreLines: coreFile.split('\n').length,
    viewLines: thinView.split('\n').length,
});
