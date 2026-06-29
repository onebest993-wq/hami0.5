import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const orphanStart = lines.findIndex(
    (l, i) => i > 0 && lines[i - 1].trim() === ')}' && l.includes('stayOfExecutionActive'),
);
const bottomSpacer = lines.findIndex((l) => l.includes('{/* BOTTOM SPACER FOR SMOOTH SCROLLING */}'));
let orphanEnd = bottomSpacer;
while (orphanEnd < lines.length && !lines[orphanEnd].trim().startsWith('</div>')) orphanEnd++;
// include first orphan closing div after spacer block
while (orphanEnd < lines.length && lines[orphanEnd].trim() === '') orphanEnd++;
if (lines[orphanEnd]?.trim() === '</div>') orphanEnd++;

if (orphanStart < 0 || bottomSpacer < 0) {
    console.error('orphan markers', { orphanStart, bottomSpacer });
    process.exit(1);
}

let out = [...lines.slice(0, orphanStart), ...lines.slice(orphanEnd)];

// remove duplicate closing div before ColleagueConsultationProvider
const providerIdx = out.findIndex((l) => l.includes('</ColleagueConsultationProvider>'));
if (providerIdx > 2 && out[providerIdx - 1].trim() === '</div>' && out[providerIdx - 2].trim() === '</div>') {
    out.splice(providerIdx - 1, 1);
}

const keys = JSON.parse(fs.readFileSync('scripts/_phone-body-keys.json', 'utf8'));
const sourceLines = keys.map((k) => `            ${k},`).join('\n');

const gateBlock = `    const phoneBodyFingerprint = computeExecutionPhoneBodyFingerprint({
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

let content = out.join('\n');
if (!content.includes('const phoneBodyFingerprint')) {
    content = content.replace(
        '    const { shellOverlaysReady, overlayUrgent } = useExecutionShellOverlaysGate({',
        gateBlock + '    const { shellOverlaysReady, overlayUrgent } = useExecutionShellOverlaysGate({',
    );
}

if (!content.includes('LazyExecutionDashboardPhoneBody')) {
    content = content.replace(
        '    LazyExecutionDashboardShellOverlays,',
        '    LazyExecutionDashboardPhoneBody,\n    LazyExecutionDashboardShellOverlays,',
    );
}

fs.writeFileSync(dashPath, content);
console.log('fixed orphan', { orphanStart, orphanEnd, removed: orphanEnd - orphanStart });
