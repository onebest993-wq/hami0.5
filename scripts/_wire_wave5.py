"""Wave 5: wire dossier lifecycle orchestrator + stay handlers + settlement in core."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
core_path = ROOT / 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'
text = core_path.read_text(encoding='utf-8')

# imports
if 'useExecutionDossierLifecycleActionsOrchestrator' not in text:
    text = text.replace(
        '    useExecutionDossierLifecyclePanelOrchestrator,\n',
        '    useExecutionDossierLifecycleActionsOrchestrator,\n    useExecutionDossierLifecyclePanelOrchestrator,\n',
    )
if 'useExecutionDashboardStayHandlers' not in text:
    text = text.replace(
        'import { useExecutionDashboardPaymentHandlers } from \'./executionDashboardCore/useExecutionDashboardPaymentHandlers\';',
        'import { useExecutionDashboardPaymentHandlers } from \'./executionDashboardCore/useExecutionDashboardPaymentHandlers\';\n'
        'import { useExecutionDashboardStayHandlers } from \'./executionDashboardCore/useExecutionDashboardStayHandlers\';',
    )

# replace dossier lifecycle duplicate block
start = text.index('    const applyDossierLifecycleToFileAndTimeline = useCallback(')
end = text.index('    const {\n        showEditDossierMetaModal,')
orchestrator_block = """
    const {
        applyDossierLifecycleToFileAndTimeline,
        handleDossierLifecyclePick,
        handleDossierLifecycleConfirmDetails,
    } = useExecutionDossierLifecycleActionsOrchestrator({
        executionData,
        executionId,
        executionDataRef,
        dossierFileKey,
        financialLedgerRef,
        seizedAssetsSnapshotRef,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMerge,
        reconcileDossierLifecycle,
        showToast,
        dossierPendingStatus,
        dossierReasonDraft,
        dossierDateDraft,
        setDossierReasonDraft,
        setDossierDateDraft,
        setDossierPendingStatus,
        setDossierLifecyclePanelPhase,
        closeDossierLifecyclePanel,
    });

"""
text = text[:start] + orchestrator_block + text[end:]

# replace stay block
start = text.index('    const handleLiftStayOfExecution = useCallback(() => {')
end = text.index('    const {\n        handlePartyDeathSave,')
stay_block = """
    const { handleLiftStayOfExecution, handleSpecialCasesStay, handleResumeExecution } =
        useExecutionDashboardStayHandlers({
            executionData,
            file,
            currentFileId,
            nextTimelineId,
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
            setCaseTasksPending,
            setExecutionPaused,
        });

"""
text = text[:start] + stay_block + text[end:]

# remove handleSettlementFromCalculator block and extend payment hook destructure
start = text.index('    // 🆕 V9: SETTLEMENT CALCULATOR HANDLER')
end = text.index('    const handleNotifyDebtor = (')
text = text[:start] + text[end:]

text = text.replace(
    'const { handlePayment, handlePaymentFromCalculator, handleFundsLedgerPayment } =',
    'const {\n        handlePayment,\n        handlePaymentFromCalculator,\n        handleFundsLedgerPayment,\n        handleSettlementFromCalculator,\n    } =',
)

# scope sources - add handleSettlementFromCalculator after handleResumeExecution if missing
if 'handleSettlementFromCalculator,' not in text:
    text = text.replace(
        '            handleResumeExecution,\n',
        '            handleResumeExecution,\n            handleSettlementFromCalculator,\n',
    )

core_path.write_text(text, encoding='utf-8')
print('done', core_path.stat().st_size)
