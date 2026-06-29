import fs from 'fs';

const dashPath = 'src/app/components/lawyer/ExecutionDashboard.tsx';
const lines = fs.readFileSync(dashPath, 'utf8').split(/\r?\n/);

const overlayRanges = [
    [13764, 14070],
    [15011, 15623],
];

const identifiers = new Set();
const skipValues = new Set([
    'true',
    'false',
    'null',
    'undefined',
    'EXEC_OVERLAY_LAZY_FALLBACK',
    'EXEC_MODAL_BACKDROP_STRONG',
    'EXEC_MODAL_Z',
    'LazyDecisionsAndAppealsEngine',
    'LazyModalSeizedAssetsManager',
    'LazyPremiumTimelineAuditLog',
    'LazyGuarantorDetailsPostApprovalModal',
    'LazyStayOfExecutionModal',
    'LazyPartyDeathReportModal',
    'LazyUnifiedSummonsHub',
    'LazyExecutorApprovedDateTimeModal',
    'LazyPoliceAssistanceDetailsModal',
    'LazyExecutorBreakInventoryFurnitureModal',
    'LazyExecutorJudicialCustodianModal',
    'LazyExecutorWorkflowConfirmModal',
    'History',
    'Suspense',
    'String',
    'Boolean',
    'Number',
    'queueMicrotask',
    'document',
    'open',
    'info',
    'event',
    'message',
    'next',
    'prev',
    'e',
    'n',
    'merged',
    'other',
    'warning',
    'appeals',
    'property',
    'initial_award',
    'no_bidders',
    'default',
]);

for (const [start, end] of overlayRanges) {
    for (let i = start - 1; i < end; i++) {
        const line = lines[i];
        const propRe = /\b([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{([A-Za-z_][A-Za-z0-9_.?]*)\}/g;
        let m;
        while ((m = propRe.exec(line))) {
            const prop = m[1];
            const val = m[2].split('.')[0].split('?')[0];
            if (!skipValues.has(val) && !val.startsWith('Lazy') && !val.startsWith('EXEC_')) {
                identifiers.add(val);
            }
            if (prop && !prop.startsWith('Lazy') && !prop.startsWith('EXEC_')) {
                // include prop name if it's a bare identifier reference pattern showX={showX}
            }
        }
        const bareRe = /\{([A-Za-z_][A-Za-z0-9_]*)\s*&&/g;
        while ((m = bareRe.exec(line))) {
            if (!skipValues.has(m[1])) identifiers.add(m[1]);
        }
    }
}

// followup snapshot block
const followupStart = lines.findIndex((l) => l.includes('value={buildFollowupModalSnapshot({'));
const followupEnd = lines.findIndex((l, i) => i > followupStart && l.trim() === '})}');
const followupBlock = lines.slice(followupStart, followupEnd + 1).join('\n');
const followupInner = followupBlock
    .replace(/^\s*value=\{buildFollowupModalSnapshot\(\{/, '')
    .replace(/\}\)\}$/, '');

for (const m of followupInner.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*,?\s*$/gm)) {
    const id = m[1];
    if (!skipValues.has(id) && !id.startsWith('Lazy') && id !== 'kasabTerminationEmphasis') {
        identifiers.add(id);
    }
}
for (const m of followupInner.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) {
    identifiers.add(m[1]);
}

// seized property keys
const seizedKeys = fs
    .readFileSync(
        'src/app/components/lawyer/ExecutionDashboard/hooks/pickSeizedPropertyPortalProps.ts',
        'utf8',
    )
    .match(/'([a-zA-Z0-9_]+)'/g)
    .map((s) => s.slice(1, -1));
for (const k of seizedKeys) identifiers.add(k);

// edit overlay keys from type
const editProps = fs
    .readFileSync(
        'src/app/components/lawyer/ExecutionDashboard/components/ExecutionDashboardEditOverlays.tsx',
        'utf8',
    )
    .match(/^\s+([a-zA-Z0-9_]+):/gm);
if (editProps) {
    for (const m of editProps) {
        const k = m.trim().replace(':', '');
        if (k !== 'export' && k !== 'type') identifiers.add(k);
    }
}

identifiers.add('showUnifiedExecutionModal');
identifiers.add('file');
identifiers.add('requestEditTimelineEvent');
identifiers.add('clearDecisionsModalBootState');
identifiers.add('realEstateModalInitial');
identifiers.add('saveRealEstateSeizureFromModal');
identifiers.add('setShowRealEstateSeizureModal');
identifiers.add('realEstateSeizureModalDecisionId');
identifiers.add('showRealEstateSeizureModal');
identifiers.add('decisionsModalBootListTab');
identifiers.add('decisionsModalBootHubTab');
identifiers.add('decisionsModalScrollToDecisionId');
identifiers.add('appealsModalScrollToDecisionId');
identifiers.add('firstActiveAppealDecisionId');
identifiers.add('executorApprovalActions');
identifiers.add('executionDataRef');
identifiers.add('mergedTimelineEventsDebtorScoped');
identifiers.add('mergedTimelineEvents');
identifiers.add('setShowRealEstateSeizureModal');
identifiers.add('GuarantorDetailsPostApprovalModal');
identifiers.add('StayOfExecutionModal');
identifiers.add('PartyDeathReportModal');
identifiers.add('modalResolvedEmployeeSummonsAssignment');
identifiers.add('modalKasabTerminationEmphasis');
identifiers.add('modalActiveDebtorNoticeScope');
identifiers.add('modalShowEmployeeAssignmentCoerciveBlock');
identifiers.add('modalShowPersonalCoerciveFollowupTab');
identifiers.add('modalEmployeeCoerciveDetentionRestricted');
identifiers.add('modalPersonalTabLockedForEmployee');
identifiers.add('followupAssignmentWorkspaceCtx');
identifiers.add('financialLawyerFeesAmount');
identifiers.add('alimonyBeneficiaryDeathModalOpen');
identifiers.add('alimonyBeneficiaryDeathModalProfile');
identifiers.add('alimonyBeneficiaryProfile');
identifiers.add('setAlimonyBeneficiaryDeathModalOpen');
identifiers.add('setAlimonyBeneficiaryDeathModalProfile');
identifiers.add('handleAlimonyBeneficiaryDeathConfirm');
identifiers.add('handleEmployeeAssignmentResolveForcedBringOutcome');
identifiers.add('resolvedEmployeeSummonsAssignment');
identifiers.add('setShowPaymentCalculator');
identifiers.add('setShowSettlementCalculator');
identifiers.add('showPaymentCalculator');
identifiers.add('showSettlementCalculator');
identifiers.add('handlePaymentFromCalculator');
identifiers.add('handleSettlementFromCalculator');
identifiers.add('setShowLedgerModal');
identifiers.add('showLedgerModal');
identifiers.add('showTransferFileNumberChangeModal');
identifiers.add('setShowTransferFileNumberChangeModal');
identifiers.add('showLinkedDossierTimeline');
identifiers.add('linkedDossierToView');
identifiers.add('setShowLinkedDossierTimeline');
identifiers.add('setLinkedDossierToView');
identifiers.add('total_execution_expenses');
identifiers.add('evictionCaseExpensesTotalForFinancial');
identifiers.add('judicialCustodianSalariesExpenseIqd');
identifiers.add('shouldCalculateExecutionFee');
identifiers.add('hasFinancialLedger');
identifiers.add('readUnifiedFundsLedger');
identifiers.add('filterUnifiedLawyerFeesHideFileDuplicate');
identifiers.add('filterUnifiedExpensesHideFileDuplicate');
identifiers.add('formatUnifiedLedgerDate');
identifiers.add('totalOwed');
identifiers.add('Pause');
identifiers.add('Play');
identifiers.add('AlertCircle');
identifiers.add('CheckCircle');
identifiers.add('X');
identifiers.add('History');
identifiers.add('LazyExecutorApprovedDateTimeModal');
identifiers.add('LazyPoliceAssistanceDetailsModal');
identifiers.add('LazyExecutorBreakInventoryFurnitureModal');
identifiers.add('LazyExecutorJudicialCustodianModal');
identifiers.add('LazyExecutorWorkflowConfirmModal');

const sorted = [...identifiers].sort();
const shorthand = sorted.map((k) => `        ${k},`).join('\n');

const propsBlock = `    const shellOverlayProps = {
${shorthand}
        executionFollowupModalSnapshot: buildFollowupModalSnapshot({
${followupInner}
        }),
    };`;

// find insertion point: before "    return (" of main component - search for ExecutionToast block
const returnIdx = lines.findIndex((l) => l.trim() === 'return (' && lines[l.indexOf('return') - 1]?.includes('ColleagueConsultationProvider') === false);
// better: line before "    return (" after persistExecutionMergeRef
let insertIdx = lines.findIndex((l) => l.includes('    return (') && lines[lines.indexOf(l) - 1]?.includes('executionFileSnapshotRef'));
if (insertIdx < 0) {
    insertIdx = lines.findIndex((l) => l.trim().startsWith('return (') && lines[lines.indexOf(l) + 1]?.includes('ColleagueConsultationProvider'));
}

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

const replacement = `            {shellOverlaysReady ? (
            <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionDashboardShellOverlays {...shellOverlayProps} />
            </Suspense>
            ) : null}

`;

// Remove overlay ranges from bottom to top
let newLines = [...lines];
for (const [start, end] of [...overlayRanges].sort((a, b) => b[0] - a[0])) {
    newLines = [...newLines.slice(0, start - 1), ...newLines.slice(end)];
}

// After adjustment, find toast zIndex line and insert replacement after toast component closes
const toastCloseIdx = newLines.findIndex((l) => l.includes('zIndex={EXEC_MODAL_Z.toastAboveExecution}'));
let insertOverlayIdx = toastCloseIdx;
while (insertOverlayIdx < newLines.length && !newLines[insertOverlayIdx].includes('/>')) {
    insertOverlayIdx++;
}
insertOverlayIdx += 1; // after ExecutionToast />

newLines = [
    ...newLines.slice(0, insertIdx),
    gateBlock,
    propsBlock,
    ...newLines.slice(insertIdx),
];

// re-find toast after insert
const toastCloseIdx2 = newLines.findIndex((l) => l.includes('zIndex={EXEC_MODAL_Z.toastAboveExecution}'));
let insertOverlayIdx2 = toastCloseIdx2;
while (insertOverlayIdx2 < newLines.length && !newLines[insertOverlayIdx2].includes('/>')) {
    insertOverlayIdx2++;
}
insertOverlayIdx2 += 1;
newLines = [...newLines.slice(0, insertOverlayIdx2), replacement, ...newLines.slice(insertOverlayIdx2)];

// Remove old MODALS comment block if duplicate empty
let content = newLines.join('\n');

if (!content.includes('useExecutionShellOverlaysGate')) {
    content = content.replace(
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';",
        "import { buildFollowupModalSnapshot } from './ExecutionDashboard/followupModalSnapshot';\nimport { useExecutionShellOverlaysGate } from './ExecutionDashboard/hooks/useExecutionShellOverlaysGate';",
    );
}
if (!content.includes('LazyExecutionDashboardShellOverlays')) {
    content = content.replace(
        '    prefetchExecutionDashboardShellOverlays,',
        '    LazyExecutionDashboardShellOverlays,\n    prefetchExecutionDashboardShellOverlays,',
    );
}

fs.writeFileSync(dashPath, content);
fs.writeFileSync('scripts/shell-overlay-props-keys.json', JSON.stringify(sorted, null, 2));
console.log('wired shell overlays, keys:', sorted.length, 'removed lines:', overlayRanges.reduce((a, [s, e]) => a + (e - s + 1), 0));
