import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
let content = fs.readFileSync(dashPath, 'utf8');
const lines = content.split(/\r?\n/);

const gateStart = lines.findIndex((l) => l.includes('const { shellOverlaysReady'));
const propsStart = lines.findIndex((l) => l.includes('const shellOverlayProps = {'));
const propsEnd = lines.findIndex((l, i) => i > propsStart && l.trim() === '};' && lines[i - 1]?.includes('}),'));

if (gateStart < 0 || propsStart < 0 || propsEnd < 0) {
    console.error('markers not found', { gateStart, propsStart, propsEnd });
    process.exit(1);
}

const { shell } = JSON.parse(fs.readFileSync('scripts/_overlay-keys.json', 'utf8'));
const SHELL_BLACKLIST = new Set([
    'checked',
    'currentTotal',
    'decisionId',
    'earnerForcedActionUnlocked',
    'size',
    'timelineEvent',
    'onCloseDecisionsModal',
    'onRestoreCaseNote',
    'onRestoreCaseTask',
    'onRequestEditTimelineEvent',
    'GuarantorDetailsPostApprovalModal',
    'PartyDeathReportModal',
    'PremiumTimelineAuditLog',
    'StayOfExecutionModal',
    'PoliceAssistanceDetailsModal',
    'executionFollowupModalSnapshot',
]);
const shellKeys = shell.filter((k) => !SHELL_BLACKLIST.has(k));
const sourceLines = shellKeys.map((k) => `            ${k},`).join('\n');

const replacement = `    const { shellOverlaysReady, overlayUrgent } = useExecutionShellOverlaysGate({
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
    });

    const shellOverlayScopeRef = useExecutionShellOverlayScopeRef(
        shellOverlaysReady && overlayUrgent,
        () => ({
${sourceLines}
        }),
    );`;

const newLines = [
    ...lines.slice(0, gateStart),
    ...replacement.split('\n'),
    ...lines.slice(propsEnd + 1),
];
content = newLines.join('\n');

content = content.replace(
    /<LazyExecutionDashboardShellOverlays \{\.\.\.shellOverlayProps\} \/>/,
    `<ExecutionShellOverlayScopeProvider scopeRef={shellOverlayScopeRef}>
            <LazyExecutionDashboardShellOverlays showUnifiedExecutionModal={showUnifiedExecutionModal} />
            </ExecutionShellOverlayScopeProvider>`,
);

if (!content.includes('useExecutionShellOverlayScopeRef')) {
    content = content.replace(
        "import { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';",
        "import { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';\nimport { useExecutionShellOverlayScopeRef } from './ExecutionDashboard/hooks/useExecutionShellOverlayScopeRef';\nimport { ExecutionShellOverlayScopeProvider } from './ExecutionDashboard/hooks/executionShellOverlayScope';",
    );
}

content = content.replace(
    "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';\n",
    '',
);

fs.writeFileSync(dashPath, content);
console.log('patched', { gateStart, propsEnd, shellKeys: shellKeys.length });
