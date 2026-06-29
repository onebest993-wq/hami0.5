import fs from 'fs';

const p27 = fs.readFileSync('scripts/patch-slice27.mjs', 'utf8');

function extractVar(name) {
    const re = new RegExp(`const ${name} = \`([\\s\\S]*?)\`;`);
    const m = p27.match(re);
    if (!m) throw new Error(`missing ${name}`);
    return m[1];
}

let ws = extractVar('wsDestructure');
ws = ws.replace(
    /        persistExecutionMergeRef,\n        pushTimelineEventRef,\n        executionFileSnapshotRef,\n    \}\);/,
    '    });',
);
ws = ws.replace(
    '        timelineEventsRef,\n        earnerFeeCollectionSm',
    '        timelineEventsRef,\n        persistExecutionMergeRef, pushTimelineEventRef, executionFileSnapshotRef,\n        earnerFeeCollectionSm',
);
fs.writeFileSync('scripts/patch-slice27-ws-snippet.txt', ws);

fs.writeFileSync('scripts/patch-slice27-grace-snippet.txt', extractVar('graceReplacement'));
fs.writeFileSync('scripts/patch-slice27-persist-snippet.txt', extractVar('persistReplacement').replace(
    '        setShowDecisionsModal,\n        setCaseTasksPending,',
    '        setShowDecisionsModal,\n        showDecisionsModal,\n        setCaseTasksPending,',
));

const p28 = fs.readFileSync('scripts/patch-slice28.mjs', 'utf8');
fs.writeFileSync(
    'scripts/patch-slice28-metadata-snippet.txt',
    p28.match(/const metadataReplacement = `([\s\S]*?)`;/)[1],
);

const p26 = fs.readFileSync('scripts/patch-slice26.mjs', 'utf8');
let fol = p26.match(/const replacement = `([\s\S]*?)`;/)[1];
fs.writeFileSync('scripts/patch-slice26-followup-snippet.txt', fol);

const p25 = fs.readFileSync('scripts/patch-slice25b.mjs', 'utf8');
fs.writeFileSync('scripts/patch-slice25b-claim-snippet.txt', p25.match(/const replacement = `([\s\S]*?)`;/)[1]);

let rt = extractVar('runtimeReplacement');
rt = rt.replace('        READY_FOR_COERCIVE,', "        READY_FOR_COERCIVE: 'READY_FOR_COERCIVE',");
rt = rt.replace(
    '        ...persistHandlerPipeline,',
    '        ...persistHandlerPipeline,\n        ...fileMetadataBinding,',
);

const scope = `
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
        assemblyHandlers: {
            ...pickHandlerClusterAssemblyHandlers(handlerCluster),
            ...pickCoreAssemblyHandlers(coreRuntimeVars),
        },
        scopeLocalFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),
        scopeRestFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),
        modalScopeInput: buildExecutionDashboardCoreModalScopeInput({
            modals,
            setExecutionModal,
            showLinkedDossierTimeline,
            showTransferFileNumberChangeModal,
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
            setShowLinkedDossierTimeline,
            setShowTransferFileNumberChangeModal,
            setEditingNoteId,
            followupOrchestrator,
            seizureOrchestrator,
        }),
        chunkSetupInput: {
            fingerprintInput: buildExecutionDashboardCoreChunkFingerprint({
                executionId,
                activeTabId,
                activeFinancialTab,
                activeTimelineFilter,
                executionPaused,
                dossierLifecyclePanel,
                toastEpoch,
                unifiedLedgerRevision,
                followupOrchestrator,
                showUnifiedSeizureLogModal,
                timelineAccordionExpanded,
                isFinancialCenterExpanded,
                isHeaderExpanded,
                coercionOrchestrator,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
            }),
            chunkDataReady: Boolean(executionData),
        },
    });

`;

const tail = `    const specificDeliveryConvertedAmount =
        (executionData as { specificDeliveryConvertedAmount?: number | null } | null | undefined)
            ?.specificDeliveryConvertedAmount ?? null;
    const specificDeliveryFinancialized = Boolean(
        (executionData as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized,
    );

${rt}
    const handlerClusterCore = buildHandlerClusterCoreInput(coreRuntimeVars);

    const handlerCluster = useExecutionDashboardCoreHandlerCluster(
        collectHandlerClusterContext({
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
            core: handlerClusterCore,
        }),
    );
${scope}`;

fs.writeFileSync('scripts/patch-slice28-tail-snippet.txt', tail);
console.log('snippets OK');
