import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const modalsStart = lines.findIndex((l) => l.includes('{/* MODALS */}'));
const mainDash = lines.findIndex((l) => l.includes('{/* MAIN DASHBOARD */}'));
const seizedStart = lines.findIndex(
    (l, n) => n > mainDash && l.includes('{seizedPropertyStepModalOpen &&'),
);
const bottomSpacer = lines.findIndex((l) => l.includes('{/* BOTTOM SPACER FOR SMOOTH SCROLLING */}'));
let seizedEnd = bottomSpacer - 1;
while (seizedEnd > seizedStart && lines[seizedEnd].trim() === '') seizedEnd--;
const postOverlaysStart = lines.findIndex(
    (l, n) => n > mainDash && l.includes('{showNotificationModal &&'),
);
const linkedStart = lines.findIndex((l) => l.includes('{showLinkedDossierTimeline && linkedDossierToView'));
const linkedEnd = lines.findIndex((l, n) => n >= linkedStart && l.trim() === ')}');
const fuStart = lines.findIndex((l) => l.includes('value={buildFollowupModalSnapshot({'));
const fuEnd = lines.findIndex((l, i) => i > fuStart && l.trim().endsWith('})}'));

const markers = {
    modalsStart,
    mainDash,
    seizedStart,
    seizedEnd,
    postOverlaysStart,
    linkedStart,
    linkedEnd,
    fuStart,
    fuEnd,
};
if (Object.values(markers).some((i) => i < 0)) {
    console.error('marker miss', markers);
    process.exit(1);
}

const followupInner = lines
    .slice(fuStart + 1, fuEnd)
    .map((l) => l.replace(/^                    /, '            '))
    .join('\n');

const removedSections = [
    ...lines.slice(modalsStart, mainDash),
    ...lines.slice(seizedStart, seizedEnd + 1),
    ...lines.slice(postOverlaysStart, linkedEnd + 1),
];

const JSX_PROP_BLACKLIST = new Set([
    'visible',
    'open',
    'value',
    'className',
    'style',
    'type',
    'role',
    'dir',
    'tone',
    'title',
    'placeholder',
    'message',
    'epoch',
    'zIndex',
    'fallback',
    'key',
    'id',
    'initial',
    'disabled',
    'profile',
    'dossier',
    'executionId',
    'onClose',
    'onClick',
    'onChange',
    'onSubmit',
    'onSave',
    'onDelete',
    'onConfirm',
    'onOpenChange',
    'onValidationWarning',
    'onDocumentUploaded',
    'onTimelineUpdate',
    'onPayment',
    'onSettlement',
    'onRestoreTimelineEvent',
    'onPermanentDeleteTimeline',
    'onPermanentDeleteCaseNote',
    'onPermanentDeleteCaseTask',
    'onUpdate',
    'ref',
    'children',
    'snapshot',
    'bootHubTab',
    'decisionsScrollToIdOnBoot',
    'appealsScrollToIdOnBoot',
    'footer',
    'counts',
    'entries',
    'config',
    'sessions',
    'source',
    'entityId',
    'requiredExpertCount',
    'entityHit',
    'entities',
    'next',
    'prev',
    'info',
    'event',
    'docEvent',
    'mergedRow',
    'rowForRemote',
    'execId',
    'now',
    'open',
    'Suspense',
]);

const keys = new Set();
for (const line of removedSections) {
    for (const m of line.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{/g)) {
        const k = m[1];
        if (!k.startsWith('Lazy') && !k.startsWith('EXEC_') && !JSX_PROP_BLACKLIST.has(k)) {
            keys.add(k);
        }
    }
    const c = line.match(/\{([A-Za-z_][A-Za-z0-9_]*)\s*&&/);
    if (c && !JSX_PROP_BLACKLIST.has(c[1])) keys.add(c[1]);
    const t = line.match(/\?\s*\(\s*$/);
    if (t) {
        const prev = line.match(/\{([A-Za-z_][A-Za-z0-9_]*)\s*\?/);
        if (prev) keys.add(prev[1]);
    }
}
for (const line of lines.slice(fuStart, fuEnd + 1)) {
    for (const m of line.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?::|,)/g)) keys.add(m[1]);
}
for (const m of fs
    .readFileSync('src/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts', 'utf8')
    .matchAll(/'([a-zA-Z0-9_]+)'/g)) {
    keys.add(m[1]);
}

const EXTRA_KEYS = [
    'X',
    'History',
    'Pause',
    'Play',
    'AlertCircle',
    'CheckCircle',
    'file',
    'requestEditTimelineEvent',
    'LazyExecutorApprovedDateTimeModal',
    'LazyPoliceAssistanceDetailsModal',
    'PoliceAssistanceDetailsModal',
    'LazyExecutorBreakInventoryFurnitureModal',
    'LazyExecutorJudicialCustodianModal',
    'LazyExecutorWorkflowConfirmModal',
    'EXEC_OVERLAY_LAZY_FALLBACK',
    'EXEC_MODAL_BACKDROP_STRONG',
    'EXEC_MODAL_Z',
    'showUnifiedExecutionModal',
];
for (const k of EXTRA_KEYS) keys.add(k);

keys.delete('open');
keys.delete('Suspense');
keys.delete('TimelineEvent');
keys.delete('FollowupModalContext');
keys.delete('Provider');

const sorted = [...keys].sort();
const shorthand = sorted.map((k) => `        ${k},`).join('\n');

let out = [
    ...lines.slice(0, modalsStart),
    ...lines.slice(mainDash, seizedStart),
    ...lines.slice(seizedEnd + 1, postOverlaysStart),
    ...lines.slice(linkedEnd + 1),
];

const returnIdx = out.findIndex(
    (l, i) => l.trim() === 'return (' && out[i + 1]?.includes('ColleagueConsultationProvider'),
);

const gateAndProps = `    const { shellOverlaysReady } = useExecutionShellOverlaysGate({
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

    const shellOverlayProps = {
${shorthand}
        executionFollowupModalSnapshot: buildFollowupModalSnapshot({
${followupInner}
        }),
    };

`;

out = [...out.slice(0, returnIdx), gateAndProps, ...out.slice(returnIdx)];

const shellJsx = `            {shellOverlaysReady ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDashboardShellOverlays {...shellOverlayProps} />
            </Suspense>
            ) : null}

`;

const toastZ = out.findIndex((l) => l.includes('zIndex={EXEC_MODAL_Z.toastAboveExecution}'));
let toastEnd = toastZ;
while (!out[toastEnd].trim().startsWith('/>')) toastEnd++;
toastEnd += 1;
out = [...out.slice(0, toastEnd), shellJsx, ...out.slice(toastEnd)];

let content = out.join('\n');

if (!content.includes('LazyExecutionDashboardShellOverlays,')) {
    content = content.replace(
        '    prefetchExecutionOverlayModals,',
        '    LazyExecutionDashboardShellOverlays,\n    prefetchExecutionDashboardShellOverlays,\n    prefetchExecutionOverlayModals,',
    );
}
if (!content.includes("from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate'")) {
    content = content.replace(
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';",
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';\nimport { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';",
    );
}
if (!content.includes('prefetchExecutionDashboardShellOverlays()')) {
    content = content.replace(
        'prefetchExecutionOverlayModals();',
        'prefetchExecutionOverlayModals();\n                prefetchExecutionDashboardShellOverlays();',
    );
}
if (!content.includes('createPortal(')) {
    content = content.replace("import { createPortal } from 'react-dom';\n", '');
}

fs.writeFileSync(dashPath, content);
console.log('wired', sorted.length, 'keys', {
    modalsStart,
    mainDash,
    seizedStart,
    seizedEnd,
    postOverlaysStart,
    linkedEnd,
});
