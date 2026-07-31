import fs from 'fs';

const path =
    'c:/Users/HEX STORE/Downloads/New folder/src/app/components/lawyer/ExecutionDashboard/components/SeizureRequestsTab.tsx';
const content = fs.readFileSync(path, 'utf8');

const newImports = `// @ts-nocheck
import React from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    DECISIONS_RELOAD_EVENT,
    appendPendingExecutorSeizureDecision,
    closeSeizureSubtypeDecisionCycle,
    getGoverningSeizureDecisionBySubtype,
    isExecutorRowRejectedAndFinal,
    isGuarantorRequestDecisionRow,
    readExecutorDecisionsArray,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { SeizureMatrixButtonKey, SeizureMatrixResult } from '@/app/utils/seizureMatrix';
import { resolveSeizureMatrixFromExecution } from '@/app/utils/seizureMatrix';
import { SeizureMatrixExpandLink } from '@/app/components/lawyer/execution/SeizureMatrixExpandLink';
import { shouldShowGuarantorRequestInSeizureTab } from './hiddenFollowupRequestsUtils';
import { isSalarySeizureAsset } from '@/app/components/lawyer/ExecutionDashboard/hooks/useSeizureRegistryAssets';
import { isSalarySeizureLaneOccupied } from '@/app/components/lawyer/ExecutionDashboard/utils/salarySeizureTabUtils';
import { isFollowupRequestKindAllowed } from '@/app/utils/executionDomainIsolation';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    SEIZURE_LOG_TAB_SUBTYPE,
    isSeizureRegistrationComplete,
    isSeizureRequestFullyRegistered,
    openUnifiedSeizureLogTab,
    resolveGoverningSalaryDecision,
    type UnifiedSeizureLogTab,
} from './seizureRequestsTabHelpers';
import { SeizureRequestsTabGuarantorBlock } from './SeizureRequestsTabGuarantorBlock';
import { SeizureRequestsTabSalaryBlock } from './SeizureRequestsTabSalaryBlock';
import {
    SeizureMovableRequestBlock,
    SeizurePropertyRequestBlock,
    SeizureThirdPartyRequestBlock,
} from './SeizureRequestsTabAssetBlocks';

`;

const propsStart = content.indexOf('export interface SeizureRequestsTabProps');
const deadCodeStart = content.indexOf('    const parseIsoFromYmd = (ymd: string): string | null => {');
const submitStart = content.indexOf('    const submitBasicSeizureRequest = React.useCallback(');
const renderStart = content.indexOf('    const renderPropertyCompletion = (row: any) => {');
let propsAndLogic =
    content.slice(propsStart, deadCodeStart) + content.slice(submitStart, renderStart);
propsAndLogic = propsAndLogic.replace(
    /    const salaryDecision = React\.useMemo\(\(\) => \{[\s\S]*?\n    \}, \[resolvedExecutionId, decisions\]\);/,
    `    const salaryDecision = React.useMemo(
        () => resolveGoverningSalaryDecision(resolvedExecutionId, decisions),
        [resolvedExecutionId, decisions],
    );`,
);

const newReturn = `    const sharedAssetBlockProps = {
        seizureActionsDisabled,
        decisions,
        resolvedExecutionId,
        inlineActionGateKey,
        setInlineActionGateKey,
        acknowledgeSeizureRequestFromLog,
        submitBasicSeizureRequest,
        requestFollowupSeizureDecision,
        openAppeals,
        saveCoerciveAction,
        showToast,
    };

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
`;

const newContent = newImports + propsAndLogic + newReturn;
fs.writeFileSync(path, newContent);
console.log(newContent.split('\n').length);
