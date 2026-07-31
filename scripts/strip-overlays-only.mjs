import fs from 'fs';

const path = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

const modalsStart = lines.findIndex((l) => l.includes('{/* MODALS */}'));
const mainDash = lines.findIndex((l) => l.includes('{/* MAIN DASHBOARD */}'));
const seizedStart = lines.findIndex(
    (l, n) =>
        n > mainDash &&
        (l.includes('ExecutionDashboardSeizedPropertyPortals') ||
            l.includes('{showNotificationModal &&')),
);
const linkedStart = lines.findIndex((l) => l.includes('{showLinkedDossierTimeline && linkedDossierToView'));
const linkedEnd = lines.findIndex((l, n) => n >= linkedStart && l.trim() === ')}');

if ([modalsStart, mainDash, seizedStart, linkedStart, linkedEnd].some((i) => i < 0)) {
    console.error('markers', { modalsStart, mainDash, seizedStart, linkedStart, linkedEnd });
    process.exit(1);
}

let out = [
    ...lines.slice(0, modalsStart),
    ...lines.slice(mainDash, seizedStart),
    ...lines.slice(linkedEnd + 1),
];

const returnIdx = out.findIndex((l, i) => l.trim() === 'return (' && out[i + 1]?.includes('ColleagueConsultationProvider'));

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

    const shellOverlayProps = buildShellOverlayProps({
        AlertCircle,
        CheckCircle,
        History,
        Pause,
        Play,
        X,
        LazyCoerciveTab,
        LazyCommunicationsTab,
        LazyDecisionsAndAppealsEngine,
        LazyDossierControlsTab,
        LazyExecutorApprovedDateTimeModal,
        LazyExecutorBreakInventoryFurnitureModal,
        LazyExecutorJudicialCustodianModal,
        LazyExecutorWorkflowConfirmModal,
        LazyFinancialTab,
        LazyGuarantorDetailsPostApprovalModal,
        LazyModalSeizedAssetsManager,
        LazyOtherPartyTab,
        LazyPartyDeathReportModal,
        LazyPersonalTab,
        LazyPoliceAssistanceDetailsModal,
        LazyPremiumTimelineAuditLog,
        LazyRequestsTab,
        LazySeizureRequestsTab,
        LazyStayOfExecutionModal,
        LazyUnifiedSummonsHub,
        DebtorFinancialProgressBar,
        EXEC_MODAL_BACKDROP_STRONG,
        EXEC_MODAL_Z,
        EXEC_OVERLAY_LAZY_FALLBACK,
        ...argumentsBagPlaceholder,
    });
`;

// placeholder replaced below with spread of shorthand from generated keys file
const _keys = JSON.parse(
    fs.readFileSync('scripts/shell-overlay-keys.json', 'utf8').catch?.() ||
        '[]',
);

out = [...out.slice(0, returnIdx), gate, ...out.slice(returnIdx)];

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
content = content.replace('...argumentsBagPlaceholder,', '// KEYS_INLINE');

fs.writeFileSync(path, content);
console.log('stripped overlays');
