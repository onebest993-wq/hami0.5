import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const fingerprintStart = lines.findIndex((l) => l.includes('const phoneBodyFingerprint'));
const phoneGateStart = lines.findIndex((l) => l.includes('const { phoneBodyReady }'));
const phoneScopeStart = lines.findIndex((l) => l.includes('const phoneBodyScopeRef ='));
const phoneScopeEnd = lines.findIndex((l, i) => i > phoneScopeStart && l.trim() === '}));');
const shellGateStart = lines.findIndex((l) => l.includes('const { shellOverlaysReady'));
const shellScopeStart = lines.findIndex((l) => l.includes('const shellOverlayScopeRef ='));
const shellScopeEnd = lines.findIndex(
    (l, i) => i > shellScopeStart && l.trim() === ');' && lines[i - 1]?.trim() === '}),',
);

const markers = {
    fingerprintStart,
    phoneGateStart,
    phoneScopeStart,
    phoneScopeEnd,
    shellGateStart,
    shellScopeStart,
    shellScopeEnd,
};
if (Object.values(markers).some((i) => i < 0)) {
    console.error('markers', markers);
    process.exit(1);
}

const keys = JSON.parse(fs.readFileSync('scripts/_chunk-scope-keys.json', 'utf8'));
const sourceLines = keys.map((k) => `            ${k},`).join('\n');

const fingerprintBlock = lines.slice(fingerprintStart, phoneGateStart).join('\n');

const unifiedBlock = `${fingerprintBlock}
    const executionModalFlags = {
        showUnifiedExecutionModal,
        showDecisionsModal,
        showDocumentsModal,
        showTimelineModal,
        showCoerciveModal,
        showNotificationModal,
        showUnifiedSummonsModal,
        showPaymentModal,
        showSeizedAssetsModal,
        showNotesModal,
        showAppointmentModal,
    };

    const { phoneBodyReady, shellOverlaysReady, overlayUrgent } =
        useExecutionDashboardLazyChunkGates(executionModalFlags);

    const chunkScopeRef = useExecutionDashboardChunkScopeRef(
        phoneBodyReady,
        shellOverlaysReady && overlayUrgent,
        () => ({
${sourceLines}
        }),
    );
`;

let content = [...lines.slice(0, fingerprintStart), ...unifiedBlock.split('\n'), ...lines.slice(shellScopeEnd + 1)].join(
    '\n',
);

// Unified provider wrapping both lazy chunks
const oldShellBlock = /\{shellOverlaysReady \? \(\s*\n\s*<Suspense fallback=\{EXEC_OVERLAY_LAZY_FALLBACK\}>\s*\n\s*<ExecutionShellOverlayScopeProvider scopeRef=\{shellOverlayScopeRef\}>\s*\n\s*<LazyExecutionDashboardShellOverlays[^]*?<\/ExecutionShellOverlayScopeProvider>\s*\n\s*<\/Suspense>\s*\n\s*\) : null\}/s;

const newShellPhoneBlock = `{phoneBodyReady || shellOverlaysReady ? (
            <ExecutionDashboardChunkScopeProvider scopeRef={chunkScopeRef}>
            {shellOverlaysReady ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDashboardShellOverlays showUnifiedExecutionModal={showUnifiedExecutionModal} />
            </Suspense>
            ) : null}
            {phoneBodyReady ? (
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
            </Suspense>
            ) : (
            <div
                className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
                aria-hidden
            />
            )}
            </ExecutionDashboardChunkScopeProvider>
            ) : (
            <div
                className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
                aria-hidden
            />
            )}`;

if (oldShellBlock.test(content)) {
    content = content.replace(
        oldShellBlock,
        newShellPhoneBlock.split('\n').slice(0, 9).join('\n'),
    );
}

// Remove duplicate phone body section
content = content.replace(
    /\s*\{\/\* MAIN DASHBOARD — lazy phone body \*\/\}\s*\n\s*\{phoneBodyReady \? \(\s*\n\s*<Suspense fallback=\{EXEC_SECTION_LAZY_FALLBACK\}>\s*\n\s*<ExecutionPhoneBodyScopeProvider scopeRef=\{phoneBodyScopeRef\}>\s*\n\s*<LazyExecutionDashboardPhoneBody[^]*?<\/ExecutionPhoneBodyScopeProvider>\s*\n\s*<\/Suspense>\s*\n\s*\) : \(\s*\n\s*<div[^]*?aria-hidden\s*\n\s*\/>\s*\n\s*\)\}/s,
    '',
);

content = content.replace(
    /import \{ useExecutionShellOverlaysGate \} from '\.\/ExecutionDashboard\/hooks\/useExecutionShellOverlaysGate';\nimport \{ useExecutionShellOverlayScopeRef \} from '\.\/ExecutionDashboard\/hooks\/useExecutionShellOverlayScopeRef';\nimport \{ useExecutionPhoneBodyScopeRef \} from '\.\/ExecutionDashboard\/hooks\/useExecutionPhoneBodyScopeRef';\nimport \{ ExecutionPhoneBodyScopeProvider \} from '\.\/ExecutionDashboard\/hooks\/executionPhoneBodyScope';\nimport \{ useExecutionDashboardPhoneBodyGate \} from '\.\/ExecutionDashboard\/hooks\/useExecutionDashboardPhoneBodyGate';\nimport \{ ExecutionShellOverlayScopeProvider \} from '\.\/ExecutionDashboard\/hooks\/executionShellOverlayScope';/,
    "import { useExecutionDashboardLazyChunkGates } from './ExecutionDashboard/hooks/useExecutionDashboardLazyChunkGates';\nimport { useExecutionDashboardChunkScopeRef } from './ExecutionDashboard/hooks/useExecutionDashboardChunkScopeRef';\nimport { ExecutionDashboardChunkScopeProvider } from './ExecutionDashboard/hooks/executionDashboardChunkScope';",
);

// Expand fingerprint inputs
content = content.replace(
    `        dataRevision: unifiedLedgerRevision,
    });`,
    `        dataRevision: unifiedLedgerRevision,
        executionDebtorTabIndex,
        showUnifiedSeizureLogModal,
        timelineAccordionExpanded,
        isFinancialCenterExpanded,
    });`,
);

// Remove duplicate prefetch in idle if gates handle it - optional keep both

fs.writeFileSync(dashPath, content);
console.log('merged', { keys: keys.length, removedLines: shellScopeEnd - phoneGateStart + 1 });
