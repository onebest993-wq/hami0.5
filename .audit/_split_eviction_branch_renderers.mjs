import fs from 'node:fs';
import path from 'node:path';

const hooksDir = path.resolve(
    'src/app/components/lawyer/execution/evictionField/hooks',
);
const srcPath = path.join(hooksDir, 'useEvictionFieldBranchRenderers.tsx');
const outDir = path.join(hooksDir, 'branchRenderers');
const src = fs.readFileSync(srcPath, 'utf8');
const lines = src.split(/\r?\n/);

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

// Original line numbers (1-based inclusive):
// renderFieldVisitInline body: 150-314
// findActive + resolveFieldVisit: 316-342
// renderInlineDecision: 344-635
// renderEvictionBranchPanelBody: 637-762
// renderBranchChevron: 764-774

const fieldVisitFn = `import React from 'react';
import {
    fieldVisitAppointmentStorageKey,
} from '@/app/utils/executorApprovalWorkflow';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    dispatchDecisionsReload,
    getExecutorDecisionRowById,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { ExecutionInlineAccordion, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { buildArabicDateLabel } from './arabicDateLabels';
import type { EvictionDecisionRow } from './evictionDecisionRowTypes';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createRenderFieldVisitInline(ctx: EvictionBranchRenderersCtx) {
    const {
        decisions,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        appealSync,
        toast,
        decisionsExecId,
        collapseBranchPanel,
        policeBtnRef,
        renderRowFollowupBlock,
    } = ctx;

    return (row: EvictionDecisionRow) => {
${slice(151, 313).split('\n').map((l) => (l.startsWith('        ') ? l.slice(4) : l)).join('\n')}
    };
}
`;

const inlineDecisionFn = `import React from 'react';
import {
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { ExecutionInlineAccordion, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { JudicialCustodianInlineForm } from '@/app/components/lawyer/execution/JudicialCustodianInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import { branchRowNeedsPostApprovalInlineWork } from '../../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../../utils/isJudicialCustodianRowDetailsComplete';
import type { EvictionDecisionRow } from './evictionDecisionRowTypes';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createFindActiveApprovedIncompleteRow(ctx: EvictionBranchRenderersCtx) {
    const { decisions } = ctx;
    return (branch: string) => {
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
        const newest = getGoverningEvictionProcedureRowForBranch(list, branch);
        if (!newest) return null;
        if (
            isExecutorRowApprovedWorkflowActive(newest, list) &&
            !isExecutorRowRejectedAndFinal(newest) &&
            isEvictionProcedureRowActive(newest, list) &&
            !isEvictionProcedureRowWorkflowComplete(newest)
        ) {
            return newest;
        }
        return null;
    };
}

export function createResolveFieldVisitScheduleRow(
    ctx: EvictionBranchRenderersCtx,
    findActiveApprovedIncompleteRow: ReturnType<typeof createFindActiveApprovedIncompleteRow>,
) {
    const { executionData, resolvePanelExecutionId } = ctx;
    return () => {
        const fromActive = findActiveApprovedIncompleteRow('Field Visit Date');
        if (fromActive?.id) return fromActive;
        const execId = resolvePanelExecutionId();
        if (!execId) return null;
        const hint = findApprovedFieldVisitNeedingSchedule(execId, executionData);
        if (!hint?.decisionId) return null;
        return getExecutorDecisionRowById(execId, hint.decisionId);
    };
}

export function createRenderInlineDecision(
    ctx: EvictionBranchRenderersCtx,
    deps: {
        findActiveApprovedIncompleteRow: ReturnType<typeof createFindActiveApprovedIncompleteRow>;
        resolveFieldVisitScheduleRow: ReturnType<typeof createResolveFieldVisitScheduleRow>;
        renderFieldVisitInline: (row: EvictionDecisionRow) => React.ReactNode;
    },
) {
    const {
        inlineExpandedByBranch,
        decisions,
        resolvedExistingJudicialCustodians,
        locked,
        savePoliceAssistance,
        openPoliceAssistanceDetails,
        appealSync,
        toast,
        decisionsExecId,
        collapseBranchPanel,
        saveJudicialCustodianDetails,
        tryOpenPendingCustodianDetails,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim,
        maritalFurnitureItems,
        saveMaritalFurnitureDeliveryInventory,
        saveBreakInventoryLedger,
        renderRowFollowupBlock,
    } = ctx;
    const { findActiveApprovedIncompleteRow, resolveFieldVisitScheduleRow, renderFieldVisitInline } = deps;

    return (branch: string, label: string, afterApprove?: React.ReactNode) => {
${slice(345, 634).split('\n').map((l) => (l.startsWith('        ') ? l.slice(4) : l)).join('\n')}
    };
}
`;

const panelBodyFn = `import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { branchRowNeedsPostApprovalInlineWork } from '../../utils/branchRowNeedsPostApprovalInlineWork';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createRenderEvictionBranchPanelBody(
    ctx: EvictionBranchRenderersCtx,
    renderInlineDecision: (branch: string, label: string, afterApprove?: React.ReactNode) => React.ReactNode,
) {
    const {
        inlineExpandedByBranch,
        isBranchInProgress,
        branchFollowupBlocked,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        branchAppealCycleSuperseded,
        syncForBranch,
        resolvePanelExecutionId,
        decisions,
        renderBranchExecutorActionsStrip,
        openAppeals,
        isBranchWorkflowComplete,
    } = ctx;

    return (
        branch: string,
        label: string,
        afterApprove?: React.ReactNode,
        onRejectedResubmit?: () => void
    ) => {
${slice(643, 761).split('\n').map((l) => (l.startsWith('        ') ? l.slice(4) : l)).join('\n')}
    };
}

export function createRenderBranchChevron(ctx: EvictionBranchRenderersCtx) {
    const { isBranchInProgress, inlineExpandedByBranch } = ctx;
    return (branch: string) => {
        if (!isBranchInProgress(branch)) return null;
        const open = Boolean(inlineExpandedByBranch[branch]);
        return (
            <ChevronDown
                size={18}
                strokeWidth={2}
                className={\`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 \${open ? 'rotate-180' : ''}\`}
            />
        );
    };
}
`;

fs.writeFileSync(path.join(outDir, 'createRenderFieldVisitInline.tsx'), fieldVisitFn);
fs.writeFileSync(path.join(outDir, 'createRenderInlineDecision.tsx'), inlineDecisionFn);
fs.writeFileSync(path.join(outDir, 'createRenderEvictionBranchPanelBody.tsx'), panelBodyFn);
console.log('wrote branch renderer factories');
console.log('fieldVisit', fieldVisitFn.split('\n').length);
console.log('inline', inlineDecisionFn.split('\n').length);
console.log('panel', panelBodyFn.split('\n').length);
