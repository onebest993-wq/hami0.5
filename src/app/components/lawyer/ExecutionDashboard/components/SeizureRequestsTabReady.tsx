import React from 'react';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { SeizureRequestsTabGuarantorBlock } from './SeizureRequestsTabGuarantorBlock';
import { SeizureRequestsTabSalaryBlock } from './SeizureRequestsTabSalaryBlock';
import {
    SeizureMovableRequestBlock,
    SeizurePropertyRequestBlock,
    SeizureThirdPartyRequestBlock,
} from './SeizureRequestsTabAssetBlocks';
import { useSeizureRequestsTabModel } from './useSeizureRequestsTabModel';
import type { ToastOptions } from './useSeizureRequestsTabModel.types';
import { SeizureRequestsTabExpandLanes } from './SeizureRequestsTabExpandLanes';

export interface SeizureRequestsTabProps {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    remainingBalanceIqd?: number;
    financialCenterTotalIqd?: number;
    seizureMatrix?: SeizureMatrixResult;
    seizureDetailCompletion: { decisionRowId: string; assetId: string; actionType: 'salary' | 'property' | 'vehicle' } | null;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    persistGuarantorFollowupDetails: (
        guarantorName: string,
        guarantorWorkplace: string,
        opts?: {
            salaryIqd: number | null;
            deductionIqd: number | null;
            guaranteeType?: 'amount' | 'attendance';
        }
    ) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    getLocalTodayYmd: () => string;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: ToastOptions) => void;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee?: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleCoerciveAction: (type: string) => void;
    handleGuarantorRequestFromFollowup: () => void;
    requestFollowupSeizureDecision: (subtype: 'third_party', title: string, body: string) => void;
    requestGuarantorSeizure?: (
        kind: 'salary' | 'movable' | 'property',
        opts?: { inline?: boolean },
    ) => void;
    hideAllGuarantorPresence?: boolean;
    financialGuarantorRequestOnly?: boolean;
    isFinancialDebtCollectionClaim?: boolean;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    isAlimonyClaim?: boolean;
    claimType?: string;
}

export const SeizureRequestsTabReady: React.FC<SeizureRequestsTabProps> = ({
    executionId,
    executionData,
    remainingBalanceIqd = 0,
    seizureMatrix: seizureMatrixProp,
    seizureDetailCompletion: _seizureDetailCompletion,
    saveCoerciveAction,
    persistExecutionMerge,
    persistGuarantorFollowupDetails,
    pushTimelineEvent,
    nextTimelineId,
    getLocalTodayYmd,
    showToast,
    activeDebtorIsDeceased,
    activeDebtorIsEmployee = false,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    inlineActionGateKey,
    setInlineActionGateKey,
    handleCoerciveAction,
    handleGuarantorRequestFromFollowup,
    requestFollowupSeizureDecision,
    requestGuarantorSeizure,
    hideAllGuarantorPresence = false,
    financialGuarantorRequestOnly = false,
    isFinancialDebtCollectionClaim = false,
    settlementBreachTriggeredAt = null,
    ledgerPendingSettlement = null,
    isAlimonyClaim: _isAlimonyClaim = false,
    claimType: _claimType = '',
}) => {
    const {
        seizureMatrix,
        progressive,
        seizureActionsDisabled,
        additionalSeizureExpanded,
        setAdditionalSeizureExpanded,
        maximumSeizureExpanded,
        setMaximumSeizureExpanded,
        financialCenterBalanceIqd,
        showRecommendedButton,
        showManualButton,
        showGuarantorRequestInTab,
        resolvedExecutionId,
        guarantorExistingWarningOpen,
        setGuarantorExistingWarningOpen,
        setLastSalaryDecisionId,
        decisions,
        thirdPartyNameDraft,
        setThirdPartyNameDraft,
        thirdPartyAmountDraft,
        setThirdPartyAmountDraft,
        openAppeals,
        openDecisions,
        openGuarantorDetails,
        findLatestGuarantorDecision,
        acknowledgeSeizureRequestFromLog,
        thirdPartyDecision,
        propertyDecision,
        movableDecision,
        submitBasicSeizureRequest,
        salaryRowForUi,
        hasActiveSalarySeizure,
        salaryRequestSettled,
        salaryLogReady,
        salaryRegistrationAckReady,
        openSalarySeizureRequest,
        salaryRequestTitle,
        sharedAssetBlockProps,
    } = useSeizureRequestsTabModel({
        executionId,
        executionData,
        remainingBalanceIqd,
        seizureMatrix: seizureMatrixProp,
        saveCoerciveAction,
        pushTimelineEvent,
        nextTimelineId,
        showToast,
        activeDebtorIsDeceased,
        activeDebtorIsEmployee,
        executionCoerciveButtonDisabled,
        coerciveUiLocked,
        isHistoricalMode,
        inlineActionGateKey,
        setInlineActionGateKey,
        requestFollowupSeizureDecision,
        hideAllGuarantorPresence,
        financialGuarantorRequestOnly,
        isFinancialDebtCollectionClaim,
        settlementBreachTriggeredAt,
        ledgerPendingSettlement,
        persistExecutionMerge,
    });

    return (
        <div className="space-y-3 text-right">
            {showGuarantorRequestInTab ? (
                <SeizureRequestsTabGuarantorBlock
                    executionCoerciveButtonDisabled={executionCoerciveButtonDisabled}
                    coerciveUiLocked={coerciveUiLocked}
                    isHistoricalMode={isHistoricalMode}
                    findLatestGuarantorDecision={findLatestGuarantorDecision}
                    decisions={decisions}
                    executionData={executionData}
                    resolvedExecutionId={resolvedExecutionId}
                    inlineActionGateKey={inlineActionGateKey}
                    setInlineActionGateKey={setInlineActionGateKey}
                    guarantorExistingWarningOpen={guarantorExistingWarningOpen}
                    setGuarantorExistingWarningOpen={setGuarantorExistingWarningOpen}
                    handleGuarantorRequestFromFollowup={handleGuarantorRequestFromFollowup}
                    persistGuarantorFollowupDetails={persistGuarantorFollowupDetails}
                    requestGuarantorSeizure={requestGuarantorSeizure}
                    openAppeals={openAppeals}
                    openDecisions={openDecisions}
                    openGuarantorDetails={openGuarantorDetails}
                />
            ) : null}
            {!seizureMatrix.showTabContentButtons ? (
                seizureMatrix.requiresSoftActivationModal ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center">
                        <p className="text-sm leading-relaxed text-slate-300">
                            المتبقي بذمة المدين في الشريحة الأولى (حتى مليوني دينار). تفعيل إجراءات الحجز لهذه الإضبارة يتم بموافقة المحامي.
                        </p>
                        <p className="mt-2 text-xs text-slate-500 tabular-nums">
                            المتبقي: {financialCenterBalanceIqd.toLocaleString('ar-IQ')} د.ع
                        </p>
                        <button
                            type="button"
                            disabled={executionCoerciveButtonDisabled || coerciveUiLocked || isHistoricalMode}
                            onClick={() => persistExecutionMerge({ seizure_matrix_soft_opt_in: true })}
                            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/12 px-4 py-2.5 text-[13px] font-bold text-[#E6C673] touch-manipulation disabled:opacity-40"
                        >
                            تفعيل إجراءات الحجز
                        </button>
                    </div>
                ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-sm leading-relaxed text-slate-400">
                        لا تتوفر إجراءات حجز — تحقق من الوعاء المتبقي أو حالة الإضبارة.
                    </p>
                    <p className="mt-2 text-xs text-slate-500 tabular-nums">
                        المتبقي بذمة المدين: {financialCenterBalanceIqd.toLocaleString('ar-IQ')} د.ع
                    </p>
                </div>
                )
            ) : (
                <div className="flex flex-col gap-1.5">
                    {showRecommendedButton('salary') ? (
                        <SeizureRequestsTabSalaryBlock
                            seizureActionsDisabled={seizureActionsDisabled}
                            hasActiveSalarySeizure={hasActiveSalarySeizure}
                            salaryRequestSettled={salaryRequestSettled}
                            salaryRegistrationAckReady={salaryRegistrationAckReady}
                            salaryLogReady={salaryLogReady}
                            salaryRequestTitle={salaryRequestTitle}
                            salaryRowForUi={salaryRowForUi}
                            activeDebtorIsDeceased={activeDebtorIsDeceased}
                            decisions={decisions}
                            resolvedExecutionId={resolvedExecutionId}
                            inlineActionGateKey={inlineActionGateKey}
                            setInlineActionGateKey={setInlineActionGateKey}
                            acknowledgeSeizureRequestFromLog={acknowledgeSeizureRequestFromLog}
                            openSalarySeizureRequest={openSalarySeizureRequest}
                            submitBasicSeizureRequest={submitBasicSeizureRequest}
                            setLastSalaryDecisionId={setLastSalaryDecisionId}
                            openAppeals={openAppeals}
                            openDecisions={openDecisions}
                            saveCoerciveAction={saveCoerciveAction}
                            showToast={showToast}
                        />
                    ) : null}
                    {showRecommendedButton('movable') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                        />
                    ) : null}
                    {showRecommendedButton('third_party') ? (
                        <SeizureThirdPartyRequestBlock
                            {...sharedAssetBlockProps}
                            thirdPartyDecision={thirdPartyDecision}
                            thirdPartyNameDraft={thirdPartyNameDraft}
                            thirdPartyAmountDraft={thirdPartyAmountDraft}
                            setThirdPartyNameDraft={setThirdPartyNameDraft}
                            setThirdPartyAmountDraft={setThirdPartyAmountDraft}
                            executionData={executionData}
                            getLocalTodayYmd={getLocalTodayYmd}
                            pushTimelineEvent={pushTimelineEvent}
                            nextTimelineId={nextTimelineId}
                            persistExecutionMerge={persistExecutionMerge}
                        />
                    ) : null}
                    {showRecommendedButton('property') ? (
                        <SeizurePropertyRequestBlock
                            {...sharedAssetBlockProps}
                            propertyDecision={propertyDecision}
                        />
                    ) : null}

                    <SeizureRequestsTabExpandLanes
                        progressive={progressive}
                        additionalSeizureExpanded={additionalSeizureExpanded}
                        setAdditionalSeizureExpanded={setAdditionalSeizureExpanded}
                        maximumSeizureExpanded={maximumSeizureExpanded}
                        setMaximumSeizureExpanded={setMaximumSeizureExpanded}
                        showManualButton={showManualButton}
                        sharedAssetBlockProps={sharedAssetBlockProps}
                        movableDecision={movableDecision}
                        thirdPartyDecision={thirdPartyDecision}
                        thirdPartyNameDraft={thirdPartyNameDraft}
                        thirdPartyAmountDraft={thirdPartyAmountDraft}
                        setThirdPartyNameDraft={setThirdPartyNameDraft}
                        setThirdPartyAmountDraft={setThirdPartyAmountDraft}
                        executionData={executionData}
                        getLocalTodayYmd={getLocalTodayYmd}
                        pushTimelineEvent={pushTimelineEvent}
                        nextTimelineId={nextTimelineId}
                        persistExecutionMerge={persistExecutionMerge}
                        propertyDecision={propertyDecision}
                    />
                </div>
            )}
        </div>
    );
};
