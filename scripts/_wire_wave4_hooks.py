"""Wave 4: wire extracted hooks into useExecutionDashboardCore.ts"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
core_path = ROOT / 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts'
text = core_path.read_text(encoding='utf-8')

party_death_hook = """
    const {
        handlePartyDeathSave,
        handleAlimonyBeneficiaryDeathConfirm,
        handleRequestDebtorSubstitution,
        handleRequestCreditorSubstitution,
        handleCreditorDeathMenuAction,
        handleDebtorDeathMenuAction,
        debtorSubstitutionRequestStatus,
        creditorSubstitutionRequestStatus,
    } = useExecutionDashboardPartyDeathHandlers({
        executionDataRef,
        executionData,
        executionId,
        claimType,
        creditors,
        debtors,
        decisionsStorageExecutionId,
        decisionsReloadEpoch,
        partyDeathModalParty,
        setPartyDeathModalParty,
        partyDeathModalDecisionId,
        setPartyDeathModalDecisionId,
        setAlimonyBeneficiaryDeathModalProfile,
        setAlimonyBeneficiaryDeathModalOpen,
        lastHeirSubRequestAtRef,
        creditorDeathMarked,
        debtorDeathMarked,
        heirSubstitutionAllowed,
        ongoingAlimonyClaim,
        alimonyBeneficiaryProfile,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });
"""

publication_hook = """
    const {
        handlePublicationNoticeRegister,
        handlePublicationNoticeTerminate,
        handlePublicationNoticeDebtorAttended,
    } = useExecutionDashboardPublicationNoticeHandlers({
        executionActionsGridLocked,
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    });
"""

payment_hook = """
    const { handlePayment, handlePaymentFromCalculator, handleFundsLedgerPayment } =
        useExecutionDashboardPaymentHandlers({
            executionDataRef,
            executionId,
            executionData,
            paymentAmount,
            paymentDate,
            remaining,
            paidDebt,
            totalOwed,
            totalWithExecutionFee,
            paidCourtFees,
            paidDirectorateFees,
            paidClientFees,
            financialLedger,
            financialLedgerRef,
            paidDebtRef,
            seizedAssetsSnapshotRef,
            nextTimelineId,
            pushTimelineEvent,
            persistExecutionMerge,
            showToast,
            setPaidDebt,
            setFinancialLedger,
            setPaymentAmount,
            setPaymentDate,
            setShowPaymentModal,
        });
"""


def replace_block(src: str, start_marker: str, end_marker: str, replacement: str) -> str:
    start = src.index(start_marker)
    end = src.index(end_marker, start)
    return src[:start] + replacement.strip() + '\n\n' + src[end:]


text = replace_block(
    text,
    '    const handlePartyDeathSave = useCallback(',
    '    const dismissDebtorAbsenceBadge = useCallback(() => {',
    party_death_hook,
)

text = replace_block(
    text,
    '    const handlePublicationNoticeRegister = useCallback(',
    '    const noteSuccessMsgRef = useRef(',
    publication_hook,
)

text = replace_block(
    text,
    '    const handlePayment = useCallback(() => {',
    '    // 🆕 V9: SETTLEMENT CALCULATOR HANDLER',
    payment_hook,
)

import_block = """import { useExecutionDashboardPartyDeathHandlers } from './executionDashboardCore/useExecutionDashboardPartyDeathHandlers';
import { useExecutionDashboardPublicationNoticeHandlers } from './executionDashboardCore/useExecutionDashboardPublicationNoticeHandlers';
import { useExecutionDashboardPaymentHandlers } from './executionDashboardCore/useExecutionDashboardPaymentHandlers';
"""

if 'useExecutionDashboardPartyDeathHandlers' not in text:
    anchor = "import { useExecutionDashboardEmployeeAssignmentHandlers }"
    text = text.replace(
        anchor,
        import_block + anchor,
    )

core_path.write_text(text, encoding='utf-8')
print('core updated', core_path.stat().st_size)
