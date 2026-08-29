import React from 'react';
import { Scale } from '@/app/components/ui/icons/Scale';
import { SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE } from '@/app/utils/specificDeliveryMovableValuationRequest';
import { FollowupProcedureCard } from './FollowupProcedureCard';
import { SpecificDeliveryMovableValuationExpertPanel } from './SpecificDeliveryMovableValuationExpertPanel';
import { useSpecificDeliveryMovableValuationExpertCard } from './useSpecificDeliveryMovableValuationExpertCard';

export type { SpecificDeliveryMovableValuationExpertCardProps } from './specificDeliveryMovableValuationExpertCard.helpers';
import type { SpecificDeliveryMovableValuationExpertCardProps } from './specificDeliveryMovableValuationExpertCard.helpers';

export const SpecificDeliveryMovableValuationExpertCard: React.FC<
    SpecificDeliveryMovableValuationExpertCardProps
> = (props) => {
    const {
        inlineActionGateKey,
        setInlineActionGateKey,
    } = props;
    const model = useSpecificDeliveryMovableValuationExpertCard(props);

    return (
        <FollowupProcedureCard
            label={SPECIFIC_DELIVERY_MOVABLE_VALUATION_TITLE}
            subtitle={
                model.executorApproved
                    ? 'تمت الموافقة — أكمل تقرير الخبراء بالأسفل'
                    : model.hasRequest
                      ? 'طلب قيد المتابعة — اضغط لعرض الخطوات'
                      : undefined
            }
            toneClass="border-amber-500/20 hover:border-amber-500/40"
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">
                    <Scale className="w-6 h-6 text-amber-300" />
                </span>
            }
            gateKey="specific_delivery_movable_valuation_send"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={model.hasRequest}
            expanded={model.expanded}
            onToggleExpanded={() => model.setExpanded((v) => !v)}
            workflowComplete={Boolean(model.savedAt)}
            lifecycleSummary={model.lifecycleSummary}
            resubmitWarningMessage="سبق واتخاذ طلب التقدير سابقاً. يمكنك تقديم طلب جديد أو التراجع."
            onConfirmSend={model.onConfirmSend}
            panelBody={
                <SpecificDeliveryMovableValuationExpertPanel
                    row={model.latestRow}
                    executionId={model.executionId}
                    decisionRows={model.decisionRows}
                    savedAt={model.savedAt}
                    reportSavedAt={model.reportSavedAt}
                    requiredExperts={model.requiredExperts}
                    valuedItemLabel={model.valuedItemLabel}
                    expertNames={model.expertNames}
                    setExpertNames={model.setExpertNames}
                    expertNameSlots={model.expertNameSlots}
                    setExpertNameSlots={model.setExpertNameSlots}
                    estimatedValueInput={model.estimatedValueInput}
                    setEstimatedValueInput={model.setEstimatedValueInput}
                    partyDecisionLane={model.partyDecisionLane}
                    setPartyDecisionLane={model.setPartyDecisionLane}
                    openAppeals={model.openAppeals}
                    saveExpertReport={model.saveExpertReport}
                    submitExpertObjection={model.submitExpertObjection}
                    financializeAfterReportApproval={model.financializeAfterReportApproval}
                    sectionConfirmDialog={model.sectionConfirmDialog}
                />
            }
        />
    );
};
