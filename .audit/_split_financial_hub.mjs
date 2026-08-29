import fs from 'node:fs';
import path from 'node:path';

const base = path.resolve(
    'src/app/components/lawyer/ExecutionDashboard/components',
);
const srcPath = path.join(base, 'ExecutionFinancialHubPortal.tsx');
const outDir = path.join(base, 'executionFinancialHub');
fs.mkdirSync(outDir, { recursive: true });

const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

function slice(a, b) {
    return lines.slice(a - 1, b).join('\n');
}

// Props: lines 22-119
const propsFile = `import type React from 'react';

${slice(22, 119)}
`;

// Model hook: close + effects + derived (216-336) plus needed destructuring inputs
const modelFile = `import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildGhuramaaCreditorRows } from '@/app/utils/creditorPaymentProRata';
import { buildDebtorAgentSeizedItems } from '@/app/slices/financial/specialtyPublic';
import { resolveFinancialHubExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import { resolveExecutionFinancialHubPrincipalAmount } from '@/app/components/lawyer/ExecutionDashboard/utils/resolveExecutionFinancialHubPrincipal';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';

export function useExecutionFinancialHubModel(props: ExecutionFinancialHubPortalProps) {
    const {
        showExecutionFinancialHub,
        setShowExecutionFinancialHub,
        onCloseFinancialHub,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        realEstateSeizureRegistryAssets,
        movableSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        thirdPartySeizureRegistryAssets,
        standaloneExecutionMarks,
        executionData,
        executionId,
        principalDebtAmount,
        decisionsStorageExecutionId,
        claimType,
        totalOwed,
        activeDebtorIsDeceased = false,
    } = props;

${slice(216, 336)}

    return {
        closeFinancialHub,
        debtors,
        firstDebtor,
        hubDebtorIsDeceased,
        debtorJob,
        debtorEmploymentType,
        debtorKinship,
        creditors,
        additionalCreditorsPm,
        creditorsCount,
        debtorAgentSeizedItems,
        hubExecutionId,
        hubStorageRevision,
        hubPrincipalAmount,
        ghuramaaCreditors,
    };
}
`;

// Dialog: portal shell + FOC props — keep as component receiving props + model
const dialogBody = slice(340, lines.length - 1); // createPortal(...) through closing );

const dialogFile = `import React, { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { publishFinancialCenterTimelineNote } from '@/app/utils/financialCenterTimeline';
import {
    appendMonthlySettlementDefaultTask,
    buildGhuramaaDistributionMergePatch,
    computeMonthlySettlementDelayCount,
    trashMonthlySettlementDefaultTasks,
    MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE,
} from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubPortalUtils';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_TRASH_SHELL_MAX,
} from '../../executionModalMobileShell';
import type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
import type { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';

type Model = ReturnType<typeof useExecutionFinancialHubModel>;

export function ExecutionFinancialHubPortalDialog(
    props: ExecutionFinancialHubPortalProps & { model: Model },
) {
    const {
        onOpenUnifiedSeizureLog,
        financialHubAutoOpenMode,
        financialHubSeizedMovableId,
        financialHubSeizedPropertyId,
        EXEC_MODAL_BACKDROP_STRONG,
        EXEC_MODAL_Z,
        LazyFinancialOperationsCenter,
        EXEC_FOC_LAZY_FALLBACK,
        executionData,
        executionId,
        isFinancialCenterExpanded,
        setIsFinancialCenterExpanded,
        onToggleFinancialCenterExpanded,
        activeFinancialTab,
        setActiveFinancialTab,
        evictionLawyerFeesInTotals,
        isEvictionExecutionModule,
        parsedLawyerFees,
        total_execution_expenses,
        monthlyAlimony,
        totalOwed,
        remaining,
        parsedCourtFees,
        parsedDirectorateFees,
        parsedClientFees,
        financialStatus,
        isNonFinancialClaim,
        isAlimonyClaim,
        claimType,
        paidDebt,
        totalWithExecutionFee,
        calculatedExecutionFee,
        shouldCalculateExecutionFee,
        accumulatedAlimony,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        daysSinceNoticeCalculated,
        gracePeriodEnded,
        initiator,
        setShowPaymentCalculator,
        onOpenPaymentCalculator,
        setShowSettlementCalculator,
        onOpenSettlementCalculator,
        handleCoerciveAction,
        executionStatus,
        statusMetadata,
        isPaused,
        setShowLedgerModal,
        onOpenLedgerModal,
        financialLedger,
        evictionCaseExpensesTotalForFinancial,
        evictionCaseExpenses,
        setShowEvictionExpenseModal,
        onOpenEvictionExpenseModal,
        handleEvictionLawyerFeeRequest,
        lawyerFeePayoutApproved,
        handleFundsLedgerPayment,
        setTimelineEvents,
        nextTimelineId,
        guarantorFollowupAwaitingDetailsSave,
        setShowUnifiedExecutionModal,
        setExecutionDebtorTabIndex,
        primaryDebtorWorkspaceKey,
        expandDebtor,
        openGuarantorDetailsModal,
        onOpenGuarantorFollowupDetails,
        appendGuarantorFollowupRequest,
        decisionsStorageExecutionId,
        showToast,
        timelineDebtorMetadata,
        assignmentWorkspaceCtx,
        persistExecutionMerge,
        handleEvictionLedgerActivated,
        evictionAssetsTabUnlocked,
        getLocalTodayYmd,
        setCaseTasksPending,
        onClearSalarySeizurePath,
        isRepresentingDebtor = false,
    } = props;

    const {
        closeFinancialHub,
        hubDebtorIsDeceased,
        debtorJob,
        debtorEmploymentType,
        debtorKinship,
        creditorsCount,
        debtorAgentSeizedItems,
        hubExecutionId,
        hubPrincipalAmount,
        ghuramaaCreditors,
    } = props.model;

    return ${dialogBody.replace(/^return createPortal/, 'createPortal')};
}
`;

fs.writeFileSync(path.join(outDir, 'ExecutionFinancialHubPortalProps.ts'), propsFile);
fs.writeFileSync(path.join(outDir, 'useExecutionFinancialHubModel.ts'), modelFile);
fs.writeFileSync(path.join(outDir, 'ExecutionFinancialHubPortalDialog.tsx'), dialogFile);

const composer = `import React from 'react';
import type { ExecutionFinancialHubPortalProps } from './executionFinancialHub/ExecutionFinancialHubPortalProps';
import { useExecutionFinancialHubModel } from './executionFinancialHub/useExecutionFinancialHubModel';
import { ExecutionFinancialHubPortalDialog } from './executionFinancialHub/ExecutionFinancialHubPortalDialog';

export type { ExecutionFinancialHubPortalProps } from './executionFinancialHub/ExecutionFinancialHubPortalProps';

export const ExecutionFinancialHubPortal: React.FC<ExecutionFinancialHubPortalProps> = (props) => {
    const model = useExecutionFinancialHubModel(props);
    if (!props.showExecutionFinancialHub || typeof document === 'undefined') return null;
    return <ExecutionFinancialHubPortalDialog {...props} model={model} />;
};
`;

fs.writeFileSync(srcPath, composer);
fs.writeFileSync(
    path.join(outDir, 'index.ts'),
    `export type { ExecutionFinancialHubPortalProps } from './ExecutionFinancialHubPortalProps';
export { useExecutionFinancialHubModel } from './useExecutionFinancialHubModel';
export { ExecutionFinancialHubPortalDialog } from './ExecutionFinancialHubPortalDialog';
`,
);

console.log({
    props: propsFile.split('\\n').length,
    model: modelFile.split('\\n').length,
    dialog: dialogFile.split('\\n').length,
    composer: composer.split('\\n').length,
});
