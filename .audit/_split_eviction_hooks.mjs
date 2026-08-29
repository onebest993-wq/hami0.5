/**
 * Further split useEvictionFieldPanelModel into priority hooks.
 */
import fs from 'node:fs';
import path from 'node:path';

const hooksDir = path.resolve('src/app/components/lawyer/execution/evictionField/hooks');
const modelPath = path.join(hooksDir, 'useEvictionFieldPanelModel.tsx');
const lines = fs.readFileSync(modelPath, 'utf8').split(/\r?\n/);

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

function write(file, contents) {
    const out = contents.replace(/\n+$/, '') + '\n';
    fs.writeFileSync(file, out, 'utf8');
    console.log('wrote', path.relative(process.cwd(), file), out.split(/\r?\n/).length - 1);
}

// Model body map (1-based):
// 93-104 state
// 106-171 decisions (+ toast + sync)
// 173-598 actions through submit
// 600-1262 renderers

const stateBody = slice(93, 104);
const decisionsBody = slice(106, 171);
const actionsBody = slice(173, 598);
const renderersBody = slice(600, 1262);

write(
    path.join(hooksDir, 'useEvictionFieldPanelState.ts'),
    `// @ts-nocheck
import React from 'react';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';
import type { EvictionFieldProceduresPanelProps } from '../types';

export function useEvictionFieldPanelState(_props: EvictionFieldProceduresPanelProps) {
${stateBody}

    return {
        policeBtnRef,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        inlineExpandedByBranch,
        setInlineExpandedByBranch,
        inlineActionGateKey,
        setInlineActionGateKey,
        confirmGate,
        setConfirmGate,
        confirmBusy,
        setConfirmBusy,
    };
}
`,
);

write(
    path.join(hooksDir, 'useEvictionFieldDecisions.ts'),
    `// @ts-nocheck
import React, { useMemo } from 'react';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { createEmptyEvictionAppealSyncView } from '@/app/utils/evictionBranchSignals';
import {
    resolveAllEvictionAppealSync,
    type EvictionAppealSyncBranch,
    type EvictionAppealSyncView,
} from '@/app/utils/evictionAppealSync';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';

export function useEvictionFieldDecisions(
    props: EvictionFieldProceduresPanelProps,
    _state: ReturnType<typeof useEvictionFieldPanelState>,
) {
    const { decisionsStorageExecutionId, executionData = null } = props;

${decisionsBody}

    return {
        decisionsExecId,
        decisions,
        toast,
        decisionList,
        decisionRecords,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    };
}
`,
);

write(
    path.join(hooksDir, 'useEvictionFieldActions.tsx'),
    `// @ts-nocheck
import React, { useMemo } from 'react';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import { EVICTION_WORKFLOW_BY_ACTION_ID } from '@/app/utils/executorApprovalWorkflow';
import {
    appendEvictionExecutorRequest,
    dispatchDecisionsReload,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    assertEvictionBranchSubmitAllowed,
    EVICTION_ACTION_TO_APPEAL_BRANCH,
    resolveBreakInventoryWorkflowComplete,
} from '@/app/utils/evictionBranchSignals';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import { branchRowNeedsPostApprovalInlineWork } from '../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../utils/isJudicialCustodianRowDetailsComplete';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import type { useEvictionFieldDecisions } from './useEvictionFieldDecisions';

export function useEvictionFieldActions(
    props: EvictionFieldProceduresPanelProps,
    state: ReturnType<typeof useEvictionFieldPanelState>,
    decisionsApi: ReturnType<typeof useEvictionFieldDecisions>,
) {
    const {
        locked,
        decisionsStorageExecutionId,
        executionData = null,
        onRecordAction,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
    } = props;

    const {
        setInlineExpandedByBranch,
        setInlineActionGateKey,
    } = state;

    const {
        decisionsExecId,
        decisions,
        toast,
        decisionList,
        decisionRecords,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    } = decisionsApi;

${actionsBody}

    return {
        fire,
        click,
        EVICTION_BRANCH_KEYS,
        branchFollowupBlock,
        branchFollowupBlocked,
        branchAppealCycleSuperseded,
        resolvePanelExecutionId,
        handleWaiveCassationFromPanel,
        openAppeals,
        branchHasExistingHubRequest,
        isBranchWorkflowComplete,
        breakInventoryWorkflowComplete,
        isBranchNeedsCompletion,
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        branchShowsRejectedClosure,
        isBranchInProgress,
        isBranchActionable,
        toggleBranchPanel,
        collapseBranchPanel,
        handleBranchPrimaryClick,
        submitEvictionRequest,
    };
}
`,
);

write(
    path.join(hooksDir, 'useEvictionFieldBranchRenderers.tsx'),
    `// @ts-nocheck
import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import {
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
} from '@/app/utils/executorApprovalWorkflow';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    dispatchDecisionsReload,
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { ExecutionInlineAccordion, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { JudicialCustodianInlineForm } from '@/app/components/lawyer/execution/JudicialCustodianInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import { branchRowNeedsPostApprovalInlineWork } from '../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../utils/isJudicialCustodianRowDetailsComplete';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import type { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
import type { useEvictionFieldActions } from './useEvictionFieldActions';

export function useEvictionFieldBranchRenderers(
    props: EvictionFieldProceduresPanelProps,
    state: ReturnType<typeof useEvictionFieldPanelState>,
    decisionsApi: ReturnType<typeof useEvictionFieldDecisions>,
    actions: ReturnType<typeof useEvictionFieldActions>,
) {
    const {
        locked,
        executionData = null,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianDetails,
        openPoliceAssistanceDetails,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim = false,
        maritalFurnitureItems = [],
        saveMaritalFurnitureDeliveryInventory,
    } = props;

    const {
        policeBtnRef,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        inlineExpandedByBranch,
    } = state;

    const {
        decisionsExecId,
        decisions,
        toast,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    } = decisionsApi;

    const {
        EVICTION_BRANCH_KEYS,
        branchFollowupBlocked,
        branchAppealCycleSuperseded,
        resolvePanelExecutionId,
        openAppeals,
        isBranchWorkflowComplete,
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        isBranchInProgress,
        collapseBranchPanel,
    } = actions;

${renderersBody}

    return {
        buildArabicDateLabel,
        buildArabicTimeLabel,
        renderRowFollowupBlock,
        renderFieldVisitInline,
        findActiveApprovedIncompleteRow,
        resolveFieldVisitScheduleRow,
        renderInlineDecision,
        renderEvictionBranchPanelBody,
        renderBranchChevron,
    };
}
`,
);

write(
    path.join(hooksDir, 'useEvictionFieldPanelModel.tsx'),
    `// @ts-nocheck
/**
 * Composes eviction-field priority hooks into one bag for the orchestrator.
 */
import type { EvictionFieldProceduresPanelProps } from '../types';
import { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
import { useEvictionFieldActions } from './useEvictionFieldActions';
import { useEvictionFieldBranchRenderers } from './useEvictionFieldBranchRenderers';

export function useEvictionFieldPanelModel(props: EvictionFieldProceduresPanelProps) {
    void props.premisesUse;
    const state = useEvictionFieldPanelState(props);
    const decisions = useEvictionFieldDecisions(props, state);
    const actions = useEvictionFieldActions(props, state, decisions);
    const renderers = useEvictionFieldBranchRenderers(props, state, decisions, actions);

    return {
        ...props,
        residentialGracePeriodSaved: props.residentialGracePeriodSaved ?? false,
        showBreakInventoryRequest: props.showBreakInventoryRequest ?? true,
        showEvictionFieldworkRequests: props.showEvictionFieldworkRequests ?? true,
        heirsNotificationDateYmd: props.heirsNotificationDateYmd ?? '',
        executionData: props.executionData ?? null,
        isMaritalFurnitureClaim: props.isMaritalFurnitureClaim ?? false,
        maritalFurnitureItems: props.maritalFurnitureItems ?? [],
        ...state,
        ...decisions,
        ...actions,
        ...renderers,
    };
}

export type EvictionFieldPanelModel = ReturnType<typeof useEvictionFieldPanelModel>;
`,
);

write(
    path.join(hooksDir, 'index.ts'),
    `export { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
export { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
export { useEvictionFieldActions } from './useEvictionFieldActions';
export { useEvictionFieldBranchRenderers } from './useEvictionFieldBranchRenderers';
export { useEvictionFieldPanelModel } from './useEvictionFieldPanelModel';
export type { EvictionFieldPanelModel } from './useEvictionFieldPanelModel';
`,
);

console.log('priority hooks split done');
