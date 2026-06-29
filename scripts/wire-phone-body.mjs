import fs from 'fs';

const JUNK = new Set([
    'AREA', 'BOTTOM', 'BOX', 'BROWN', 'CLUNKY', 'CONTENT', 'DIAMOND', 'DELETED', 'FOR', 'GLASS',
    'HEADER', 'MICRO', 'PREMIUM', 'SCROLLING', 'SMOOTH', 'SPACER', 'TAG', 'V16', 'V17', 'EG',
    'Date', 'Math', 'String', 'Array', 'URL', 'Store', 'Suspense', 'Parties', 'Creditors',
    'Delegation', 'ExecutionFile', 'Status', 'Switcher', 'Timeline', 'pattern', 'prevSig',
    'rolled', 'sessions', 'token', 'tone', 'year', 'saving', 'actionType', 'requiredExpertCount',
    'entityHit', 'entities', 'next', 'entityId',
]);

const phonePath = 'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardPhoneBody.tsx';
let phone = fs.readFileSync(phonePath, 'utf8');

if (!phone.includes('useExecutionPhoneBodyScopeRef')) {
    phone = phone.replace(
        "import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';",
        "import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';\nimport {\n    readExecutionPhoneBodyScope,\n    useExecutionPhoneBodyScopeRef,\n} from '../hooks/executionPhoneBodyScope';",
    );
}

phone = phone.replace(
    /export const ExecutionDashboardPhoneBody = React\.memo\(function ExecutionDashboardPhoneBody\(\s*props: ExecutionDashboardPhoneBodyProps,\s*\) \{/,
    `export const ExecutionDashboardPhoneBody = React.memo(function ExecutionDashboardPhoneBody({
    renderFingerprint,
}: {
    renderFingerprint?: string;
}) {
    const scopeRef = useExecutionPhoneBodyScopeRef();
    const props = {
        ...readExecutionPhoneBodyScope(scopeRef),
        renderFingerprint,
    } as ExecutionDashboardPhoneBodyProps;`,
);

const lines = phone.split(/\r?\n/);
const start = lines.findIndex((l) => l.includes('const {'));
const end = lines.findIndex((l, i) => i > start && l.includes('} = props'));
if (start >= 0 && end >= 0) {
    const filtered = lines
        .slice(start + 1, end)
        .filter((l) => {
            const m = l.match(/^\s+([A-Za-z_][A-Za-z0-9_]*),/);
            return !m || !JUNK.has(m[1]);
        });
    lines.splice(start + 1, end - start - 1, ...filtered);
    phone = lines.join('\n');
}

phone = phone.replace(
    /\s*<ExecutionDashboardSeizedPropertyPortals \{\.\.\.pickSeizedPropertyPortalProps\(props\)\} \/>\s*\n/,
    '\n',
);

fs.writeFileSync(phonePath, phone);
console.log('patched PhoneBody');

// Wire ExecutionDashboard
const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
let dash = fs.readFileSync(dashPath, 'utf8');
const dashLines = dash.split(/\r?\n/);

const mainStart = dashLines.findIndex((l) => l.includes('{/* MAIN DASHBOARD */}'));
const mainDivStart = mainStart + 1;
let depth = 0;
let mainEnd = -1;
for (let i = mainDivStart; i < dashLines.length; i++) {
    const opens = (dashLines[i].match(/<div[\s>]/g) || []).length;
    const closes = (dashLines[i].match(/<\/div>/g) || []).length;
    if (dashLines[i].includes('<div')) depth += opens;
    depth -= closes;
    if (i > mainDivStart && depth <= 0 && dashLines[i].trim() === '</div>') {
        mainEnd = i;
        break;
    }
}

if (mainStart < 0 || mainEnd < 0) {
    console.error('main dashboard markers', { mainStart, mainEnd });
    process.exit(1);
}

const keys = JSON.parse(fs.readFileSync('scripts/_phone-body-keys.json', 'utf8'));
const sourceLines = keys.map((k) => `            ${k},`).join('\n');

const phoneWire = `            {/* MAIN DASHBOARD — lazy phone body */}
            {phoneBodyReady ? (
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>
            <ExecutionPhoneBodyScopeProvider scopeRef={phoneBodyScopeRef}>
            <LazyExecutionDashboardPhoneBody renderFingerprint={phoneBodyFingerprint} />
            </ExecutionPhoneBodyScopeProvider>
            </Suspense>
            ) : (
            <div
                className="bg-slate-900/95 w-full max-w-md h-full flex flex-col shadow-2xl border border-slate-700/30"
                dir="rtl"
                aria-hidden
            />
            )}`;

const gateInsert = `    const phoneBodyFingerprint = computeExecutionPhoneBodyFingerprint({
        executionId,
        activeTab,
        activeFinancialTab,
        activeTimelineFilter,
        executionPaused,
        dossierLifecyclePanelOpen,
        toastEpoch,
        dataRevision: unifiedLedgerRevision,
    });

    const { phoneBodyReady } = useExecutionDashboardPhoneBodyGate({
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

    const phoneBodyScopeRef = useExecutionPhoneBodyScopeRef(phoneBodyReady, () => ({
${sourceLines}
    }));

`;

if (!dash.includes('useExecutionDashboardPhoneBodyGate')) {
    dash = dash.replace(
        '    const { shellOverlaysReady, overlayUrgent } = useExecutionShellOverlaysGate({',
        gateInsert + '    const { shellOverlaysReady, overlayUrgent } = useExecutionShellOverlaysGate({',
    );
}

const newDashLines = [
    ...dashLines.slice(0, mainStart),
    ...phoneWire.split('\n'),
    ...dashLines.slice(mainEnd + 1),
];
dash = newDashLines.join('\n');

if (!dash.includes('LazyExecutionDashboardPhoneBody')) {
    dash = dash.replace(
        '    LazyExecutionDashboardShellOverlays,',
        '    LazyExecutionDashboardPhoneBody,\n    LazyExecutionDashboardShellOverlays,',
    );
}
if (!dash.includes('prefetchExecutionDashboardPhoneBody')) {
    dash = dash.replace(
        'prefetchExecutionDashboardShellOverlays();',
        'prefetchExecutionDashboardShellOverlays();\n                prefetchExecutionDashboardPhoneBody();',
    );
}
if (!dash.includes('computeExecutionPhoneBodyFingerprint')) {
    dash = dash.replace(
        "import { useExecutionShellOverlayScopeRef } from './ExecutionDashboard/hooks/useExecutionShellOverlayScopeRef';",
        "import { useExecutionShellOverlayScopeRef } from './ExecutionDashboard/hooks/useExecutionShellOverlayScopeRef';\nimport { useExecutionPhoneBodyScopeRef } from './ExecutionDashboard/hooks/useExecutionPhoneBodyScopeRef';\nimport { ExecutionPhoneBodyScopeProvider } from './ExecutionDashboard/hooks/executionPhoneBodyScope';\nimport { useExecutionDashboardPhoneBodyGate } from './ExecutionDashboard/hooks/useExecutionDashboardPhoneBodyGate';\nimport { computeExecutionPhoneBodyFingerprint } from './ExecutionDashboard/hooks/buildExecutionPhoneBodyProps';",
    );
}

fs.writeFileSync(dashPath, dash);
console.log('wired phone body', { removedLines: mainEnd - mainStart + 1, keys: keys.length });
