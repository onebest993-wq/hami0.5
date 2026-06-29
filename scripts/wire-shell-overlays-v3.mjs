import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

function idx(pred) {
    const i = lines.findIndex(pred);
    if (i < 0) throw new Error('marker missing');
    return i;
}

const modalsStart = idx((l) => l.includes('{/* MODALS */}'));
const mainDash = idx((l) => l.includes('{/* MAIN DASHBOARD */}'));
const seizedStart = idx(
    (l, n) =>
        n > mainDash &&
        (l.includes('ExecutionDashboardSeizedPropertyPortals') ||
            l.includes('{showNotificationModal &&')),
);
const linkedStart = idx((l) => l.includes('{showLinkedDossierTimeline && linkedDossierToView'));
const linkedEnd = idx((l, n) => n >= linkedStart && l.trim() === ')}');

let out = [
    ...lines.slice(0, modalsStart),
    ...lines.slice(mainDash, seizedStart),
    ...lines.slice(linkedEnd + 1),
];

const insertReturn = out.findIndex((l, i) => l.trim() === 'return (' && out[i + 1]?.includes('ColleagueConsultationProvider'));

const gate = `    const { shellOverlaysReady } = useExecutionShellOverlaysGate({
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
            <LazyExecutionDashboardShellOverlays scopeRef={shellOverlayScopeRef} />
            </Suspense>
            ) : null}
`;

out = [...out.slice(0, insertReturn), gate, ...out.slice(insertReturn)];

const toastZ = out.findIndex((l) => l.includes('zIndex={EXEC_MODAL_Z.toastAboveExecution}'));
let toastEnd = toastZ;
while (!out[toastEnd].trim().startsWith('/>')) toastEnd++;
toastEnd += 1;
out = [...out.slice(0, toastEnd), shellJsx, ...out.slice(toastEnd)];

let content = out.join('\n');

const importGate = "import { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';";
const importScope = "import { shellOverlayScopeRef, syncShellOverlayScope } from './ExecutionDashboard/hooks/executionShellOverlayScope';";
const importLazy = '    LazyExecutionDashboardShellOverlays,';

if (!content.includes('useExecutionShellOverlaysGate')) {
    content = content.replace(
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';",
        `import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';\n${importGate}\n${importScope}`,
    );
}
if (!content.includes('LazyExecutionDashboardShellOverlays')) {
    content = content.replace('    prefetchExecutionOverlayModals,', `${importLazy}\n    prefetchExecutionOverlayModals,`);
}
if (!content.includes('syncShellOverlayScope')) {
    content = content.replace(
        '    return (\n        <ColleagueConsultationProvider',
        '    syncShellOverlayScope({\n        showExecutionTrashModal,\n        trashedTimelineEvents,\n        // scope patched via executionShellOverlayScope.ts expander\n    });\n\n    return (\n        <ColleagueConsultationProvider',
    );
}

fs.writeFileSync(path, content);
console.log('deleted', modalsStart, mainDash, seizedStart, linkedEnd);
