import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
let lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

function findLine(pred, from = 0) {
    const idx = lines.findIndex((l, i) => i >= from && pred(l, i));
    if (idx < 0) throw new Error('marker not found');
    return idx;
}

const modalsStart = findLine((l) => l.includes('{/* MODALS */}'));
const mainDashIdx = findLine((l) => l.includes('{/* MAIN DASHBOARD */}'));

const seizedStart = findLine(
    (l) =>
        l.includes('ExecutionDashboardSeizedPropertyPortals') ||
        (l.includes('{showNotificationModal &&') && l.includes('LazyExecutionDebtorNotificationMemoModalContainer')),
    mainDashIdx,
);
const linkedStart = findLine((l) => l.includes('{showLinkedDossierTimeline && linkedDossierToView'));
let linkedEnd = linkedStart;
for (let i = linkedStart; i < Math.min(lines.length, linkedStart + 40); i++) {
    if (lines[i]?.trim() === ')}') {
        linkedEnd = i;
        break;
    }
}
if (linkedEnd <= linkedStart) {
    throw new Error('linked dossier block end not found');
}

// Extract followup snapshot inner
const followupStart = findLine((l) => l.includes('value={buildFollowupModalSnapshot({'));
let followupEnd = followupStart;
while (followupEnd < lines.length && !lines[followupEnd].trim().endsWith('})}')) {
    followupEnd++;
}
const followupInner = lines
    .slice(followupStart + 1, followupEnd)
    .join('\n')
    .replace(/^\s+/gm, '            ');

// Collect identifiers from sections to remove
const sectionText = [
    ...lines.slice(modalsStart, mainDashIdx),
    ...lines.slice(seizedStart, linkedEnd + 1),
].join('\n');

const identifiers = new Set();
const propAssign = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{([A-Za-z_?][A-Za-z0-9_.?]*)\}/g;
let m;
while ((m = propAssign.exec(sectionText))) {
    const val = m[2].replace(/\?/g, '').split('.')[0];
    if (!val.startsWith('Lazy') && !val.startsWith('EXEC_') && val !== 'true' && val !== 'false' && val !== 'null') {
        identifiers.add(val);
    }
}
while ((m = /\{([A-Za-z_][A-Za-z0-9_]*)\s*&&/g.exec(sectionText))) {
    identifiers.add(m[1]);
}
for (const m of followupInner.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?::|,)/g)) {
    identifiers.add(m[1]);
}

const seizedKeys = fs
    .readFileSync(
        'src/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts',
        'utf8',
    )
    .match(/'([a-zA-Z0-9_]+)'/g)
    ?.map((s) => s.slice(1, -1)) ?? [];
for (const k of seizedKeys) identifiers.add(k);

identifiers.add('showUnifiedExecutionModal');
identifiers.add('file');
identifiers.add('requestEditTimelineEvent');

const sorted = [...identifiers].sort();
const shorthand = sorted.map((k) => `        ${k},`).join('\n');

const propsBlock = `    const shellOverlayProps = {
${shorthand}
        executionFollowupModalSnapshot: buildFollowupModalSnapshot({
${followupInner}
        }),
    };
`;

const gateBlock = `    const { shellOverlaysReady } = useExecutionShellOverlaysGate({
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

`;

const shellJsx = `            {shellOverlaysReady ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDashboardShellOverlays {...shellOverlayProps} />
            </Suspense>
            ) : null}

`;

// Remove sections bottom-up
lines = [...lines.slice(0, seizedStart), ...lines.slice(linkedEnd + 1)];
const mainDashIdx2 = findLine((l) => l.includes('{/* MAIN DASHBOARD */}'));
lines = [...lines.slice(0, modalsStart), ...lines.slice(mainDashIdx2)];

// Insert gate + props before main return
const returnIdx = findLine(
    (l, i) => l.trim() === 'return (' && lines[i + 1]?.includes('ColleagueConsultationProvider'),
);
lines = [...lines.slice(0, returnIdx), gateBlock, propsBlock, ...lines.slice(returnIdx)];

// Insert shell JSX after ExecutionToast
const toastZ = findLine((l) => l.includes('zIndex={EXEC_MODAL_Z.toastAboveExecution}'));
let toastEnd = toastZ;
while (toastEnd < lines.length && !lines[toastEnd].trim().startsWith('/>')) toastEnd++;
toastEnd += 1;
lines = [...lines.slice(0, toastEnd), shellJsx, ...lines.slice(toastEnd)];

let content = lines.join('\n');

if (!content.includes('useExecutionShellOverlaysGate')) {
    content = content.replace(
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';",
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';\nimport { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';",
    );
}
if (!content.includes('LazyExecutionDashboardShellOverlays')) {
    content = content.replace(
        '    prefetchExecutionOverlayModals,',
        '    LazyExecutionDashboardShellOverlays,\n    prefetchExecutionOverlayModals,\n    prefetchExecutionDashboardShellOverlays,',
    );
}
if (!content.includes('prefetchExecutionDashboardShellOverlays')) {
    content = content.replace(
        '    prefetchExecutionOverlayModals,',
        '    prefetchExecutionOverlayModals,\n    prefetchExecutionDashboardShellOverlays,',
    );
}

// Remove createPortal import if unused
if (!content.includes('createPortal(')) {
    content = content.replace("import { createPortal } from 'react-dom';\n", '');
}

// Add prefetch call if missing
if (!content.includes('prefetchExecutionDashboardShellOverlays()')) {
    content = content.replace(
        'prefetchExecutionOverlayModals();',
        'prefetchExecutionOverlayModals();\n                prefetchExecutionDashboardShellOverlays();',
    );
}

fs.writeFileSync(dashPath, content);
console.log('wired v2, keys', sorted.length);
