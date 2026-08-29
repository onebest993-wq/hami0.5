import React from 'react';
import { InlineActionGate } from './InlineActionGate';
import {
    ExecutionInlineAccordion,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    HiddenFollowupDecisionsFollowupButton,
    HiddenFollowupDetailPanel,
    HiddenFollowupStatusLabel,
    HiddenFollowupSubmitButton,
    openHiddenFollowupSubmitOrWarn,
} from './hiddenFollowup/shared';
import { gateKeyForGuarantor } from './HiddenGuarantorRequestOptions.support';
import type { HiddenGuarantorRequestKey } from './hiddenFollowupRequestsUtils';
import type { InlineActionGateKey } from '../types';

export function HiddenGuarantorRequestDetailPanel({
    statusLabel,
    guarantorExistingWarningOpen,
    setGuarantorExistingWarningOpen,
    handleGuarantorRequestFromFollowup,
    openGuarantorRow,
    selectedKey,
    submitDisabledReason,
    showToast,
    executionDetailsSaved,
    setInlineGateKey,
    inlineGateKey,
    runSubmit,
    guarantorRequestSteps,
    guarantorSeizureRow,
    seizureSteps,
}: {
    statusLabel?: string;
    guarantorExistingWarningOpen: boolean;
    setGuarantorExistingWarningOpen: (open: boolean) => void;
    handleGuarantorRequestFromFollowup: () => void;
    openGuarantorRow: { id?: string } | null;
    selectedKey: HiddenGuarantorRequestKey;
    submitDisabledReason: string;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    executionDetailsSaved: boolean;
    setInlineGateKey: (key: InlineActionGateKey | null) => void;
    inlineGateKey: InlineActionGateKey | null;
    runSubmit: () => void;
    guarantorRequestSteps: ExecutionInlineStep[];
    guarantorSeizureRow: { id?: string } | null;
    seizureSteps: ExecutionInlineStep[];
}) {
    return (
        <HiddenFollowupDetailPanel>
            <HiddenFollowupStatusLabel>{statusLabel}</HiddenFollowupStatusLabel>

            {guarantorExistingWarningOpen ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-950/20 p-3 text-right">
                    <p className="text-[11px] font-black text-amber-200">
                        يوجد كفيل ضامن مُسجَّل في الإضبارة
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-amber-100/85">
                        أكمل الطلب فقط إذا كنت تريد استبدال الكفيل الحالي.
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setGuarantorExistingWarningOpen(false);
                                handleGuarantorRequestFromFollowup();
                            }}
                            className="rounded-xl border border-amber-400/55 bg-amber-950/40 py-2.5 text-[11px] font-extrabold text-amber-100"
                        >
                            أتفهم — متابعة
                        </button>
                        <button
                            type="button"
                            onClick={() => setGuarantorExistingWarningOpen(false)}
                            className="rounded-xl border border-white/10 bg-white/5 py-2.5 text-[11px] font-bold text-slate-200"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            ) : null}

            {!openGuarantorRow || selectedKey !== 'guarantor_request' ? (
                <div className="relative">
                    <HiddenFollowupSubmitButton
                        disabled={Boolean(submitDisabledReason)}
                        label={
                            selectedKey === 'guarantor_request'
                                ? 'إرسال طلب الكفيل'
                                : 'إرسال طلب الحجز'
                        }
                        onClick={() =>
                            openHiddenFollowupSubmitOrWarn(submitDisabledReason, showToast, () => {
                                if (selectedKey === 'guarantor_request' && executionDetailsSaved) {
                                    setGuarantorExistingWarningOpen(true);
                                    return;
                                }
                                setInlineGateKey(gateKeyForGuarantor(selectedKey));
                            })
                        }
                    />
                    {inlineGateKey === gateKeyForGuarantor(selectedKey) ? (
                        <InlineActionGate
                            gateKey={gateKeyForGuarantor(selectedKey)}
                            activeKey={inlineGateKey}
                            onConfirm={runSubmit}
                            onCancel={() => setInlineGateKey(null)}
                        />
                    ) : null}
                </div>
            ) : null}

            {selectedKey === 'guarantor_request' &&
            openGuarantorRow &&
            guarantorRequestSteps.length > 0 ? (
                <ExecutionInlineAccordion steps={guarantorRequestSteps} />
            ) : null}

            {selectedKey !== 'guarantor_request' &&
            guarantorSeizureRow &&
            seizureSteps.length > 0 ? (
                <ExecutionInlineAccordion steps={seizureSteps} />
            ) : null}
        </HiddenFollowupDetailPanel>
    );
}
