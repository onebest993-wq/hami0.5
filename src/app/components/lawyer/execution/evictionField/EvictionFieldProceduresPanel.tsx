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
