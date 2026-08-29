/**
 * Split EvictionFieldProceduresPanel → hooks/useEvictionFieldPanelModel + sections/*.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('src/app/components/lawyer/execution/evictionField');
const srcPath = path.join(root, 'EvictionFieldProceduresPanel.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

function slice(start1, end1) {
    return lines.slice(start1 - 1, end1).join('\n');
}

function write(file, contents) {
    const out = contents.replace(/\n+$/, '') + '\n';
    fs.writeFileSync(file, out, 'utf8');
    console.log('wrote', path.relative(process.cwd(), file), out.split(/\r?\n/).length - 1);
}

const hooksDir = path.join(root, 'hooks');
const sectionsDir = path.join(root, 'sections');
fs.mkdirSync(hooksDir, { recursive: true });
fs.mkdirSync(sectionsDir, { recursive: true });

// Body: lines 110–1280 (void premisesUse … renderBranchChevron)
const modelBody = slice(110, 1280);

write(
    path.join(hooksDir, 'useEvictionFieldPanelModel.tsx'),
    `// @ts-nocheck
/**
 * Eviction field procedures — panel model (state, decisions, actions, branch renderers).
 */
import React, { useMemo } from 'react';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
} from '@/app/utils/executorApprovalWorkflow';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    appendEvictionExecutorRequest,
    dispatchDecisionsReload,
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isEvictionProcedureRowWorkflowComplete,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { formatIqdDisplay, parseAmount } from '@/app/utils/execution/amountInput';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import {
    assertEvictionBranchSubmitAllowed,
    createEmptyEvictionAppealSyncView,
    EVICTION_ACTION_TO_APPEAL_BRANCH,
    resolveBreakInventoryWorkflowComplete,
} from '@/app/utils/evictionBranchSignals';
import {
    resolveAllEvictionAppealSync,
    type EvictionAppealSyncBranch,
    type EvictionAppealSyncView,
} from '@/app/utils/evictionAppealSync';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { ExecutionInlineAccordion, ExecutionInlineExecutorDecisionActions, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { JudicialCustodianInlineForm } from '@/app/components/lawyer/execution/JudicialCustodianInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';
import { branchRowNeedsPostApprovalInlineWork } from '../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../utils/isJudicialCustodianRowDetailsComplete';
import type { EvictionFieldProceduresPanelProps } from '../types';

export function useEvictionFieldPanelModel({
    locked,
    lockHint,
    timelineEvents,
    premisesUse,
    decisionsStorageExecutionId,
    executionData = null,
    showResidentialEvictionGraceButton,
    residentialGracePeriodSaved = false,
    onResidentialEvictionGraceClick,
    showResidentialGraceEarlyEndRequest,
    showBreakInventoryRequest = true,
    showEvictionFieldworkRequests = true,
    showDebtorHeirsEvictionTools,
    heirsNotificationDateYmd = '',
    onHeirsNotificationDateYmdChange,
    onIssueHeirsExecutionNoticeMemo,
    onRecordAction,
    tryOpenPendingBreakInventoryLedger,
    tryOpenPendingCustodianDetails,
    saveJudicialCustodianDetails,
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
}: EvictionFieldProceduresPanelProps) {
${modelBody}

    return {
        locked,
        lockHint,
        timelineEvents,
        premisesUse,
        decisionsStorageExecutionId,
        executionData,
        showResidentialEvictionGraceButton,
        residentialGracePeriodSaved,
        onResidentialEvictionGraceClick,
        showResidentialGraceEarlyEndRequest,
        showBreakInventoryRequest,
        showEvictionFieldworkRequests,
        showDebtorHeirsEvictionTools,
        heirsNotificationDateYmd,
        onHeirsNotificationDateYmdChange,
        onIssueHeirsExecutionNoticeMemo,
        onRecordAction,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        saveJudicialCustodianDetails,
        openPoliceAssistanceDetails,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim,
        maritalFurnitureItems,
        saveMaritalFurnitureDeliveryInventory,
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
        decisionsExecId,
        decisions,
        toast,
        decisionList,
        decisionRecords,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
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

export type EvictionFieldPanelModel = ReturnType<typeof useEvictionFieldPanelModel>;
`,
);

// --- sections ---

write(
    path.join(sectionsDir, 'HeirsNotificationSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { BTN_BASE, BTN_DISABLED } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function HeirsNotificationSection({
    locked,
    showDebtorHeirsEvictionTools,
    heirsNotificationDateYmd,
    onHeirsNotificationDateYmdChange,
    onIssueHeirsExecutionNoticeMemo,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showDebtorHeirsEvictionTools'
    | 'heirsNotificationDateYmd'
    | 'onHeirsNotificationDateYmdChange'
    | 'onIssueHeirsExecutionNoticeMemo'
>) {
    if (!showDebtorHeirsEvictionTools || !onIssueHeirsExecutionNoticeMemo) return null;

    return (
${slice(1291, 1327)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'ResidentialGraceSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { BTN_BASE, BTN_DISABLED, TONE_GRACE } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function ResidentialGraceSection({
    locked,
    showResidentialEvictionGraceButton,
    residentialGracePeriodSaved,
    onResidentialEvictionGraceClick,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showResidentialEvictionGraceButton'
    | 'residentialGracePeriodSaved'
    | 'onResidentialEvictionGraceClick'
>) {
    if (!showResidentialEvictionGraceButton || !onResidentialEvictionGraceClick) return null;

    return (
${slice(1339, 1368)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'FieldVisitBranchSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_FIELD_VISIT } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function FieldVisitBranchSection({
    locked,
    showEvictionFieldworkRequests,
    inlineExpandedByBranch,
    inlineActionGateKey,
    setInlineActionGateKey,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showEvictionFieldworkRequests'
    | 'inlineExpandedByBranch'
    | 'inlineActionGateKey'
    | 'setInlineActionGateKey'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showEvictionFieldworkRequests) return null;

    return (
${slice(1372, 1435)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'PoliceAssistanceBranchSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Shield } from '@/app/components/ui/icons/Shield';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_POLICE } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function PoliceAssistanceBranchSection({
    locked,
    showEvictionFieldworkRequests,
    policeBtnRef,
    inlineExpandedByBranch,
    inlineActionGateKey,
    setInlineActionGateKey,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showEvictionFieldworkRequests'
    | 'policeBtnRef'
    | 'inlineExpandedByBranch'
    | 'inlineActionGateKey'
    | 'setInlineActionGateKey'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showEvictionFieldworkRequests) return null;

    return (
${slice(1439, 1503)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'ResidentialGraceEarlyEndSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Timer } from '@/app/components/ui/icons/Timer';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { BTN_BASE, BTN_DISABLED, TONE_EARLY_END } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function ResidentialGraceEarlyEndSection({
    locked,
    showResidentialGraceEarlyEndRequest,
    inlineExpandedByBranch,
    confirmGate,
    setConfirmGate,
    confirmBusy,
    setConfirmBusy,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showResidentialGraceEarlyEndRequest'
    | 'inlineExpandedByBranch'
    | 'confirmGate'
    | 'setConfirmGate'
    | 'confirmBusy'
    | 'setConfirmBusy'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showResidentialGraceEarlyEndRequest) return null;

    return (
${slice(1507, 1595)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'BreakInventoryBranchSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Hammer } from '@/app/components/ui/icons/Hammer';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { BTN_BASE, BTN_DISABLED, TONE_BREAK } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function BreakInventoryBranchSection({
    locked,
    showBreakInventoryRequest,
    inlineExpandedByBranch,
    inlineActionGateKey,
    setInlineActionGateKey,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showBreakInventoryRequest'
    | 'inlineExpandedByBranch'
    | 'inlineActionGateKey'
    | 'setInlineActionGateKey'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!showBreakInventoryRequest) return null;

    return (
${slice(1599, 1662)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'JudicialCustodianBranchSection.tsx'),
    `// @ts-nocheck
import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { UserCheck } from '@/app/components/ui/icons/UserCheck';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import { BTN_BASE, BTN_DISABLED, TONE_CUSTODIAN } from '../evictionFieldStyles';
import type { EvictionFieldPanelModel } from '../hooks/useEvictionFieldPanelModel';

export function JudicialCustodianBranchSection({
    locked,
    showEvictionFieldworkRequests,
    breakInventoryWorkflowComplete,
    inlineExpandedByBranch,
    confirmGate,
    setConfirmGate,
    confirmBusy,
    setConfirmBusy,
    isBranchInProgress,
    isBranchActionable,
    isBranchWorkflowComplete,
    handleBranchPrimaryClick,
    submitEvictionRequest,
    renderEvictionBranchPanelBody,
    renderBranchChevron,
}: Pick<
    EvictionFieldPanelModel,
    | 'locked'
    | 'showEvictionFieldworkRequests'
    | 'breakInventoryWorkflowComplete'
    | 'inlineExpandedByBranch'
    | 'confirmGate'
    | 'setConfirmGate'
    | 'confirmBusy'
    | 'setConfirmBusy'
    | 'isBranchInProgress'
    | 'isBranchActionable'
    | 'isBranchWorkflowComplete'
    | 'handleBranchPrimaryClick'
    | 'submitEvictionRequest'
    | 'renderEvictionBranchPanelBody'
    | 'renderBranchChevron'
>) {
    if (!(breakInventoryWorkflowComplete && showEvictionFieldworkRequests)) return null;

    return (
${slice(1666, 1758)}
    );
}
`,
);

write(
    path.join(sectionsDir, 'index.ts'),
    `export { HeirsNotificationSection } from './HeirsNotificationSection';
export { ResidentialGraceSection } from './ResidentialGraceSection';
export { FieldVisitBranchSection } from './FieldVisitBranchSection';
export { PoliceAssistanceBranchSection } from './PoliceAssistanceBranchSection';
export { ResidentialGraceEarlyEndSection } from './ResidentialGraceEarlyEndSection';
export { BreakInventoryBranchSection } from './BreakInventoryBranchSection';
export { JudicialCustodianBranchSection } from './JudicialCustodianBranchSection';
`,
);

write(
    path.join(hooksDir, 'index.ts'),
    `export { useEvictionFieldPanelModel } from './useEvictionFieldPanelModel';
export type { EvictionFieldPanelModel } from './useEvictionFieldPanelModel';
`,
);

// --- thin orchestrator ---
write(
    path.join(root, 'EvictionFieldProceduresPanel.tsx'),
    `// @ts-nocheck
/**
 * إجراءات التخلية الميدانية — وحدة معزولة عن التنفيذ المالي الحجزي.
 * التصميم: زجاج داكن + ذهبي متوافق مع الإضبارة.
 * Orchestrator: model hook + lane sections (no visual changes).
 */

import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import type { EvictionFieldProceduresPanelProps } from './types';
import { useEvictionFieldPanelModel } from './hooks/useEvictionFieldPanelModel';
import {
    HeirsNotificationSection,
    ResidentialGraceSection,
    FieldVisitBranchSection,
    PoliceAssistanceBranchSection,
    ResidentialGraceEarlyEndSection,
    BreakInventoryBranchSection,
    JudicialCustodianBranchSection,
} from './sections';

export const EvictionFieldProceduresPanel = React.memo(function EvictionFieldProceduresPanel(
    props: EvictionFieldProceduresPanelProps,
) {
    const m = useEvictionFieldPanelModel(props);
    const {
        locked,
        lockHint,
        showDebtorHeirsEvictionTools,
        heirsNotificationDateYmd,
        onHeirsNotificationDateYmdChange,
        onIssueHeirsExecutionNoticeMemo,
        showResidentialEvictionGraceButton,
        residentialGracePeriodSaved,
        onResidentialEvictionGraceClick,
        showEvictionFieldworkRequests,
        showResidentialGraceEarlyEndRequest,
        showBreakInventoryRequest,
        breakInventoryWorkflowComplete,
        policeBtnRef,
        inlineExpandedByBranch,
        inlineActionGateKey,
        setInlineActionGateKey,
        confirmGate,
        setConfirmGate,
        confirmBusy,
        setConfirmBusy,
        isBranchInProgress,
        isBranchActionable,
        isBranchWorkflowComplete,
        handleBranchPrimaryClick,
        submitEvictionRequest,
        renderEvictionBranchPanelBody,
        renderBranchChevron,
    } = m;

    return (
        <div className="space-y-3">
            {locked && lockHint && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 backdrop-blur-xl px-3 py-2 text-amber-200 text-xs text-right">
                    {lockHint}
                </div>
            )}

            <HeirsNotificationSection
                locked={locked}
                showDebtorHeirsEvictionTools={showDebtorHeirsEvictionTools}
                heirsNotificationDateYmd={heirsNotificationDateYmd}
                onHeirsNotificationDateYmdChange={onHeirsNotificationDateYmdChange}
                onIssueHeirsExecutionNoticeMemo={onIssueHeirsExecutionNoticeMemo}
            />

            <motion.div
                className="flex flex-col gap-4"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 1 },
                    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                }}
            >
                <ResidentialGraceSection
                    locked={locked}
                    showResidentialEvictionGraceButton={showResidentialEvictionGraceButton}
                    residentialGracePeriodSaved={residentialGracePeriodSaved}
                    onResidentialEvictionGraceClick={onResidentialEvictionGraceClick}
                />

                <FieldVisitBranchSection
                    locked={locked}
                    showEvictionFieldworkRequests={showEvictionFieldworkRequests}
                    inlineExpandedByBranch={inlineExpandedByBranch}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    isBranchInProgress={isBranchInProgress}
                    isBranchActionable={isBranchActionable}
                    isBranchWorkflowComplete={isBranchWorkflowComplete}
                    handleBranchPrimaryClick={handleBranchPrimaryClick}
                    submitEvictionRequest={submitEvictionRequest}
                    renderEvictionBranchPanelBody={renderEvictionBranchPanelBody}
                    renderBranchChevron={renderBranchChevron}
                />

                <PoliceAssistanceBranchSection
                    locked={locked}
                    showEvictionFieldworkRequests={showEvictionFieldworkRequests}
                    policeBtnRef={policeBtnRef}
                    inlineExpandedByBranch={inlineExpandedByBranch}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    isBranchInProgress={isBranchInProgress}
                    isBranchActionable={isBranchActionable}
                    isBranchWorkflowComplete={isBranchWorkflowComplete}
                    handleBranchPrimaryClick={handleBranchPrimaryClick}
                    submitEvictionRequest={submitEvictionRequest}
                    renderEvictionBranchPanelBody={renderEvictionBranchPanelBody}
                    renderBranchChevron={renderBranchChevron}
                />

                <ResidentialGraceEarlyEndSection
                    locked={locked}
                    showResidentialGraceEarlyEndRequest={showResidentialGraceEarlyEndRequest}
                    inlineExpandedByBranch={inlineExpandedByBranch}
                    confirmGate={confirmGate}
                    setConfirmGate={setConfirmGate}
                    confirmBusy={confirmBusy}
                    setConfirmBusy={setConfirmBusy}
                    isBranchInProgress={isBranchInProgress}
                    isBranchActionable={isBranchActionable}
                    isBranchWorkflowComplete={isBranchWorkflowComplete}
                    handleBranchPrimaryClick={handleBranchPrimaryClick}
                    submitEvictionRequest={submitEvictionRequest}
                    renderEvictionBranchPanelBody={renderEvictionBranchPanelBody}
                    renderBranchChevron={renderBranchChevron}
                />

                <BreakInventoryBranchSection
                    locked={locked}
                    showBreakInventoryRequest={showBreakInventoryRequest}
                    inlineExpandedByBranch={inlineExpandedByBranch}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    isBranchInProgress={isBranchInProgress}
                    isBranchActionable={isBranchActionable}
                    isBranchWorkflowComplete={isBranchWorkflowComplete}
                    handleBranchPrimaryClick={handleBranchPrimaryClick}
                    submitEvictionRequest={submitEvictionRequest}
                    renderEvictionBranchPanelBody={renderEvictionBranchPanelBody}
                    renderBranchChevron={renderBranchChevron}
                />

                <JudicialCustodianBranchSection
                    locked={locked}
                    showEvictionFieldworkRequests={showEvictionFieldworkRequests}
                    breakInventoryWorkflowComplete={breakInventoryWorkflowComplete}
                    inlineExpandedByBranch={inlineExpandedByBranch}
                    confirmGate={confirmGate}
                    setConfirmGate={setConfirmGate}
                    confirmBusy={confirmBusy}
                    setConfirmBusy={setConfirmBusy}
                    isBranchInProgress={isBranchInProgress}
                    isBranchActionable={isBranchActionable}
                    isBranchWorkflowComplete={isBranchWorkflowComplete}
                    handleBranchPrimaryClick={handleBranchPrimaryClick}
                    submitEvictionRequest={submitEvictionRequest}
                    renderEvictionBranchPanelBody={renderEvictionBranchPanelBody}
                    renderBranchChevron={renderBranchChevron}
                />
            </motion.div>
        </div>
    );
});
`,
);

console.log('done');
