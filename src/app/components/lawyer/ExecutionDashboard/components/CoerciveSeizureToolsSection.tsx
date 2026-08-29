import React from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { InlineActionGateKey } from '../types';
import { useSeizureRequestsTabDecisions } from '../hooks/useSeizureRequestsTabDecisions';
import { SeizureRequestsTabSalaryBlock } from './SeizureRequestsTabSalaryBlock';
import {
    SeizureMovableRequestBlock,
    SeizurePropertyRequestBlock,
} from './SeizureRequestsTabAssetBlocks';
import type { ToastOptions } from './useSeizureRequestsTabModel.types';
export interface CoerciveSeizureToolsSectionProps {
    isEvictionExecutionModule: boolean;
    activeDebtorIsEmployee: boolean;
    activeDebtorIsDeceased: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    followupSalarySeizureLabel: string;
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    followupMonetaryCoerciveLimitedOnly: boolean;
    hideCoerciveSeizureSalaryAndProperty?: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    nextTimelineId: () => string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: ToastOptions,
    ) => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
}

/**
 * أدوات الحجز داخل تبويب «الإجراءات الجبرية» — نفس الكتل المطوّرة المستخدمة في
 * تبويب «طلبات الحجز المالية»: دورة قرار كاملة (قيد البت ← موافقة المنفذ ← إكمال
 * البيانات ← سجل الحجز) بدل الأزرار القديمة التي كانت تسجّل مباشرة دون سياق.
 */
export const CoerciveSeizureToolsSection: React.FC<CoerciveSeizureToolsSectionProps> = ({
    isEvictionExecutionModule,
    activeDebtorIsEmployee,
    activeDebtorIsDeceased,
    executionCoerciveButtonDisabled,
    coerciveUiLocked,
    isHistoricalMode,
    executionId,
    executionData,
    followupSalarySeizureLabel,
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    hideCoerciveSeizureSalaryAndProperty = false,
    inlineActionGateKey,
    setInlineActionGateKey,
    saveCoerciveAction,
    pushTimelineEvent,
    nextTimelineId,
    showToast,
    persistExecutionMerge,
}) => {
    const seizureActionsDisabled = executionCoerciveButtonDisabled || isHistoricalMode;

    const {
        resolvedExecutionId,
        decisions,
        setLastSalaryDecisionId,
        propertyDetailsDraftByDecisionId,
        setPropertyDetailsDraftByDecisionId,
        vehicleDetailsDraftByDecisionId,
        setVehicleDetailsDraftByDecisionId,
        openAppeals,
        acknowledgeSeizureRequestFromLog,
        propertyDecision,
        movableDecision,
        submitBasicSeizureRequest,
        salaryRowForUi,
        hasActiveSalarySeizure,
        salaryRequestSettled,
        salaryLogReady,
        salaryRegistrationAckReady,
        openSalarySeizureRequest,
        sharedAssetProps,
    } = useSeizureRequestsTabDecisions({
        executionId,
        executionData,
        seizureActionsDisabled,
        coerciveUiLocked,
        showToast,
        saveCoerciveAction,
        pushTimelineEvent,
        nextTimelineId,
        inlineActionGateKey,
        setInlineActionGateKey,
        activeDebtorIsDeceased,
        persistExecutionMerge,
    });

    if (isEvictionExecutionModule) return null;

    const showSalaryBlock =
        activeDebtorIsEmployee &&
        (followupEmployeeFinancialSalaryOnlyCoercive || followupMonetaryCoerciveLimitedOnly) &&
        !hideCoerciveSeizureSalaryAndProperty;
    const showPropertyAndMovableBlocks = !hideCoerciveSeizureSalaryAndProperty;

    if (!showSalaryBlock && !showPropertyAndMovableBlocks) return null;

    return (
        <div className="flex flex-col gap-3">
            {showSalaryBlock ? (
                <SeizureRequestsTabSalaryBlock
                    seizureActionsDisabled={seizureActionsDisabled}
                    hasActiveSalarySeizure={hasActiveSalarySeizure}
                    salaryRequestSettled={salaryRequestSettled}
                    salaryRegistrationAckReady={salaryRegistrationAckReady}
                    salaryLogReady={salaryLogReady}
                    salaryRequestTitle={followupSalarySeizureLabel}
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
            {showPropertyAndMovableBlocks ? (
                <>
                    <SeizurePropertyRequestBlock
                        {...sharedAssetProps}
                        propertyDecision={propertyDecision}
                        propertyDetailsDraftByDecisionId={propertyDetailsDraftByDecisionId}
                        setPropertyDetailsDraftByDecisionId={setPropertyDetailsDraftByDecisionId}
                    />
                    <SeizureMovableRequestBlock
                        {...sharedAssetProps}
                        movableDecision={movableDecision}
                        vehicleDetailsDraftByDecisionId={vehicleDetailsDraftByDecisionId}
                        setVehicleDetailsDraftByDecisionId={setVehicleDetailsDraftByDecisionId}
                    />
                </>
            ) : null}
        </div>
    );
};
