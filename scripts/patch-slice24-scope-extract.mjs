import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function flattenGroupedObjectLiteral(body) {
    const keys = [];
    for (const line of body.split('\n')) {
        const t = line.trim().replace(/,$/, '');
        if (!t || t.startsWith('//')) continue;
        if (t.endsWith(': {')) continue;
        if (t === '},' || t === '}') continue;
        if (/^[A-Za-z0-9_]+: /.test(t)) {
            keys.push(t.split(':')[0].trim());
            continue;
        }
        if (/^[A-Za-z0-9_]+$/.test(t)) keys.push(t);
    }
    return keys;
}

function extractGroupBody(text, marker) {
    const start = text.indexOf(marker);
    if (start < 0) return '';
    const bodyStart = start + marker.length;
    const end = text.indexOf('\n        }),', bodyStart);
    return text.slice(bodyStart, end);
}

const scopeStart = core.indexOf('    const specificDeliveryConvertedAmount =');
const scopeEnd = core.indexOf('    return {\n        isLoading,');
if (scopeStart < 0 || scopeEnd <= scopeStart) {
    console.error('scope extract markers not found', scopeStart, scopeEnd);
    process.exit(1);
}

const scopeBlock = core.slice(scopeStart, scopeEnd);
const localBody = extractGroupBody(scopeBlock, 'localBundleInput: collectScopeLocalBundleInput({');
const restBody = extractGroupBody(scopeBlock, 'restBundleInput: collectScopeRestBundleInput({');
const localKeys = flattenGroupedObjectLiteral(localBody);
const restKeys = flattenGroupedObjectLiteral(restBody);

const asmStart = scopeBlock.indexOf('assemblyHandlers: {');
const asmEnd = scopeBlock.indexOf('\n        },', asmStart);
let asmBody = scopeBlock.slice(asmStart + 'assemblyHandlers: {'.length, asmEnd);
asmBody = asmBody
    .split('\n')
    .filter((l) => !l.includes('pickHandlerClusterAssemblyHandlers'))
    .join('\n');

const localFlat = localKeys.map((k) => `            ${k},`).join('\n');
const restFlat = restKeys.map((k) => `            ${k},`).join('\n');

const scopeReplacement = `    const specificDeliveryConvertedAmount =
        (executionData as { specificDeliveryConvertedAmount?: number | null } | null | undefined)
            ?.specificDeliveryConvertedAmount ?? null;
    const specificDeliveryFinancialized = Boolean(
        (executionData as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized,
    );

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardCoreScopeAndChunk({
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        scopeRuntimeInput: {
            isEvictionExecutionModule,
            executionData,
            executionId,
            file,
            executorApprovalActions,
            total_execution_expenses,
            setSeizedAssets,
            seizureDraftsByDecisionId,
            setSeizureDraftsByDecisionId,
            activeCoerciveActions,
            setActiveCoerciveActions,
        },
        handlerCluster,
        assemblyHandlers: {${asmBody}
        },
        scopeLocalFlat: {
${localFlat}
        },
        scopeRestFlat: {
${restFlat}
        },
        modalScopeInput: {
            modals,
            setExecutionModal,
            showUnifiedExecutionModal: modals.showUnifiedExecutionModal,
            showDecisionsModal: modals.showDecisionsModal,
            showDocumentsModal: modals.showDocumentsModal,
            showTimelineModal: modals.showTimelineModal,
            showCoerciveModal: modals.showCoerciveModal,
            showNotificationModal: modals.showNotificationModal,
            showUnifiedSummonsModal: modals.showUnifiedSummonsModal,
            showPaymentModal: modals.showPaymentModal,
            showSeizedAssetsModal: modals.showSeizedAssetsModal,
            showNotesModal: modals.showNotesModal,
            showAppointmentModal: modals.showAppointmentModal,
            showPaymentCalculator: modals.showPaymentCalculator,
            showSettlementCalculator: modals.showSettlementCalculator,
            showPauseModal: modals.showPauseModal,
            showLedgerModal: modals.showLedgerModal,
            showEditDossierMetaModal: modals.showEditDossierMetaModal,
            showEvictionExpenseModal: modals.showEvictionExpenseModal,
            showEvictionLawyerFeeModal: modals.showEvictionLawyerFeeModal,
            showEvictionResidentialGraceModal: modals.showEvictionResidentialGraceModal,
            showGuarantorDetailsModal: modals.showGuarantorDetailsModal,
            showHeirsNotificationModal: modals.showHeirsNotificationModal,
            showLinkedDossierTimeline,
            showRealEstateSeizureModal: modals.showRealEstateSeizureModal,
            showSolidaryCoerciveTargetModal: modals.showSolidaryCoerciveTargetModal,
            showStayOfExecutionModal: modals.showStayOfExecutionModal,
            showTransferFileNumberChangeModal,
            setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
            setShowDecisionsModal,
            setShowDocumentsModal,
            setShowTimelineModal,
            setShowCoerciveModal,
            setShowNotificationModal,
            setShowUnifiedSummonsModal,
            setShowPaymentModal,
            setShowSeizedAssetsModal,
            setShowNotesModal,
            setShowAppointmentModal,
            setShowPaymentCalculator,
            setShowSettlementCalculator,
            setShowPauseModal,
            setShowLedgerModal,
            setShowEditDossierMetaModal,
            setShowEvictionExpenseModal: followupOrchestrator.setShowEvictionExpenseModal,
            setShowEvictionLawyerFeeModal: followupOrchestrator.setShowEvictionLawyerFeeModal,
            setShowEvictionResidentialGraceModal: followupOrchestrator.setShowEvictionResidentialGraceModal,
            setShowGuarantorDetailsModal: seizureOrchestrator.setShowGuarantorDetailsModal,
            setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,
            setShowLinkedDossierTimeline,
            setShowRealEstateSeizureModal: seizureOrchestrator.setShowRealEstateSeizureModal,
            setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
            setShowStayOfExecutionModal: followupOrchestrator.setShowStayOfExecutionModal,
            setShowTransferFileNumberChangeModal,
            setEditingNoteId,
        },
        chunkSetupInput: {
            fingerprintInput: {
                executionId,
                activeTabId,
                activeFinancialTab,
                activeTimelineFilter,
                executionPaused,
                dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
                dossierLifecyclePanelPhase: dossierLifecyclePanel.dossierLifecyclePanelPhase,
                dossierLifecyclePopStyle: dossierLifecyclePanel.dossierLifecyclePopStyle,
                toastEpoch,
                dataRevision: unifiedLedgerRevision,
                executionDebtorTabIndex: followupOrchestrator.executionDebtorTabIndex,
                showUnifiedSeizureLogModal,
                timelineAccordionExpanded,
                isFinancialCenterExpanded,
                isHeaderExpanded,
                debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
                voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
            },
            chunkDataReady: Boolean(executionData),
        },
    });

`;

core = core.slice(0, scopeStart) + scopeReplacement + core.slice(scopeEnd);
fs.writeFileSync(corePath, core, 'utf8');
console.log('scope extract OK, local', localKeys.length, 'rest', restKeys.length, 'core lines', core.split('\n').length);
