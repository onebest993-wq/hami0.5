// @ts-nocheck
import React from 'react';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { SeizureMatrixExpandLink } from '@/app/components/lawyer/execution/SeizureMatrixExpandLink';
import { SeizureRequestsTabGuarantorBlock } from './SeizureRequestsTabGuarantorBlock';
import { SeizureRequestsTabSalaryBlock } from './SeizureRequestsTabSalaryBlock';
import {
    SeizureMovableRequestBlock,
    SeizurePropertyRequestBlock,
    SeizureThirdPartyRequestBlock,
} from './SeizureRequestsTabAssetBlocks';
import { useSeizureRequestsTabModel } from './useSeizureRequestsTabModel';

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
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
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
    hideAllGuarantorPresence?: boolean;
    financialGuarantorRequestOnly?: boolean;
    isFinancialDebtCollectionClaim?: boolean;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    isAlimonyClaim?: boolean;
    claimType?: string;
}

export const SeizureRequestsTab: React.FC<SeizureRequestsTabProps> = ({
    executionId,
    executionData,
    remainingBalanceIqd = 0,
    seizureMatrix: seizureMatrixProp,
    seizureDetailCompletion,
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
    hideAllGuarantorPresence = false,
    financialGuarantorRequestOnly = false,
    isFinancialDebtCollectionClaim = false,
    settlementBreachTriggeredAt = null,
    ledgerPendingSettlement = null,
    isAlimonyClaim = false,
    claimType = '',
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
        propertyDetailsDraftByDecisionId,
        setPropertyDetailsDraftByDecisionId,
        vehicleDetailsDraftByDecisionId,
        setVehicleDetailsDraftByDecisionId,
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
        salaryRequestOpen,
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
    });

    return (
        <div className="p-4 space-y-3 text-right">
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
                    openAppeals={openAppeals}
                    openDecisions={openDecisions}
                    openGuarantorDetails={openGuarantorDetails}
                />
            ) : null}
            {!seizureMatrix.showTabContentButtons ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
                    <p className="text-sm leading-relaxed text-slate-400">
                        لا تتوفر إجراءات حجز — تحقق من الوعاء المتبقي أو حالة الإضبارة.
                    </p>
                    <p className="mt-2 text-xs text-slate-500 tabular-nums">
                        المتبقي بذمة المدين: {financialCenterBalanceIqd.toLocaleString('ar-IQ')} د.ع
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {showRecommendedButton('salary') && !salaryRequestOpen ? (
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
                        />
                    ) : null}
                    {showRecommendedButton('movable') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                            vehicleDetailsDraftByDecisionId={vehicleDetailsDraftByDecisionId}
                            setVehicleDetailsDraftByDecisionId={setVehicleDetailsDraftByDecisionId}
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
                            propertyDetailsDraftByDecisionId={propertyDetailsDraftByDecisionId}
                            setPropertyDetailsDraftByDecisionId={setPropertyDetailsDraftByDecisionId}
                        />
                    ) : null}

                    {progressive.showAdditionalExpand && !additionalSeizureExpanded ? (
                        <SeizureMatrixExpandLink
                            variant="additional"
                            label="إظهار خيارات حجز إضافية..."
                            onClick={() => setAdditionalSeizureExpanded(true)}
                        />
                    ) : null}

                    {showManualButton('movable', 'additional') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                            vehicleDetailsDraftByDecisionId={vehicleDetailsDraftByDecisionId}
                            setVehicleDetailsDraftByDecisionId={setVehicleDetailsDraftByDecisionId}
                        />
                    ) : null}
                    {showManualButton('third_party', 'additional') ? (
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
                    {showManualButton('property', 'additional') ? (
                        <SeizurePropertyRequestBlock
                            {...sharedAssetBlockProps}
                            propertyDecision={propertyDecision}
                            propertyDetailsDraftByDecisionId={propertyDetailsDraftByDecisionId}
                            setPropertyDetailsDraftByDecisionId={setPropertyDetailsDraftByDecisionId}
                        />
                    ) : null}

                    {progressive.showMaximumExpand && additionalSeizureExpanded && !maximumSeizureExpanded ? (
                        <SeizureMatrixExpandLink
                            variant="maximum"
                            label="إظهار خيارات الحجز القصوى..."
                            onClick={() => setMaximumSeizureExpanded(true)}
                        />
                    ) : null}

                    {showManualButton('movable', 'maximum') ? (
                        <SeizureMovableRequestBlock
                            {...sharedAssetBlockProps}
                            movableDecision={movableDecision}
                            vehicleDetailsDraftByDecisionId={vehicleDetailsDraftByDecisionId}
                            setVehicleDetailsDraftByDecisionId={setVehicleDetailsDraftByDecisionId}
                        />
                    ) : null}
                    {showManualButton('third_party', 'maximum') ? (
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
                    {showManualButton('property', 'maximum') ? (
                        <SeizurePropertyRequestBlock
                            {...sharedAssetBlockProps}
                            propertyDecision={propertyDecision}
                            propertyDetailsDraftByDecisionId={propertyDetailsDraftByDecisionId}
                            setPropertyDetailsDraftByDecisionId={setPropertyDetailsDraftByDecisionId}
                        />
                    ) : null}
                </div>
            )}
        </div>
    );
};
