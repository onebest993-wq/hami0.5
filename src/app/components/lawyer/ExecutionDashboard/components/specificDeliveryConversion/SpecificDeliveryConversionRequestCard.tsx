import React from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { SPECIFIC_DELIVERY_CONVERSION_TITLE } from '@/app/utils/specificDeliveryConversionRequest';
import { FollowupProcedureCard } from '../FollowupProcedureCard';
import type { SpecificDeliveryConversionRequestCardProps } from './SpecificDeliveryConversionRequestCardProps';
import { SpecificDeliveryItemChip } from './SpecificDeliveryItemChip';
import { renderSpecificDeliveryConversionPanel } from './renderSpecificDeliveryConversionPanel';
import { useSpecificDeliveryConversionRequestCard } from './useSpecificDeliveryConversionRequestCard';

export type { SpecificDeliveryConversionRequestCardProps } from './SpecificDeliveryConversionRequestCardProps';

export const SpecificDeliveryConversionRequestCard: React.FC<
    SpecificDeliveryConversionRequestCardProps
> = (props) => {
    const {
        inlineActionGateKey,
        setInlineActionGateKey,
    } = props;

    const {
        executionId,
        decisionRows,
        allItems,
        conversionEligibleItems,
        selectedItemIds,
        toggleSelectedItem,
        expanded,
        setExpanded,
        hasRequest,
        workflowComplete,
        lifecycleSummary,
        latestRow,
        savedAt,
        confirmDestructionAfterApproval,
        openAppeals,
        onConfirmSend,
    } = useSpecificDeliveryConversionRequestCard(props);

    if (conversionEligibleItems.length === 0 && !hasRequest) return null;

    const itemPicker = (
        <div dir="rtl" className="space-y-2.5">
            <p className="text-[11px] font-bold text-slate-300 text-center leading-relaxed">
                {conversionEligibleItems.length > 1
                    ? 'اختر الشيء أو الأشياء التي هلكت أو تعذّر تسليمها'
                    : 'الشيء محل طلب التحويل'}
            </p>
            <div
                role="group"
                aria-label="الأشياء محل التحويل"
                className="flex flex-wrap gap-2 justify-center"
            >
                {conversionEligibleItems.map((item) => (
                    <SpecificDeliveryItemChip
                        key={item.id}
                        item={item}
                        selected={selectedItemIds.has(item.id)}
                        onSelect={() => toggleSelectedItem(item.id)}
                    />
                ))}
            </div>
            {conversionEligibleItems.length > 1 && selectedItemIds.size === 0 ? (
                <p className="text-center text-[9px] font-bold text-amber-300/90">
                    اختر شيئاً واحداً أو أكثر ثم أرسل الطلب
                </p>
            ) : null}
        </div>
    );

    return (
        <FollowupProcedureCard
            label={SPECIFIC_DELIVERY_CONVERSION_TITLE}
            toneClass="border-amber-500/20 hover:border-amber-500/40"
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-amber-500/10 shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-300" />
                </span>
            }
            gateKey="specific_delivery_conversion_send"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={hasRequest}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
            workflowComplete={workflowComplete}
            lifecycleSummary={lifecycleSummary}
            resubmitWarningMessage="سبق إتمام دورة التحويل لهذا الشيء. يمكنك تقديم طلب جديد لشيء آخر أو التراجع."
            onConfirmSend={onConfirmSend}
            sendGateContent={itemPicker}
            sendGateConfirmDisabled={selectedItemIds.size === 0}
            panelBody={renderSpecificDeliveryConversionPanel({
                row: latestRow,
                workflowComplete,
                savedAt,
                decisionRows,
                allItems,
                executionId,
                openAppeals,
                confirmDestructionAfterApproval,
            })}
        />
    );
};
