import React from 'react';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Package } from '@/app/components/ui/icons/Package';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';
import { EXEC_MODAL_TOUCH_TARGET } from '../executionModalMobileShell';
import type { ExecutionFile } from '@/app/types/execution';
import { hasActiveFinancialGuarantorFollowup } from '@/app/utils/execution/guarantorFollowup';

export function shouldShowGuarantorSeizureFollowupActions(input: {
    requestGuarantorSeizure?: unknown;
    executionData: ExecutionFile | null | undefined;
}): boolean {
    if (typeof input.requestGuarantorSeizure !== 'function') return false;
    if (!hasActiveFinancialGuarantorFollowup(input.executionData)) return false;
    const gf = input.executionData?.guarantor_followup;
    if (gf?.details_saved === true) return true;
    return (
        Boolean(String(gf?.guarantor_name || '').trim()) &&
        Boolean(String(gf?.guarantor_workplace || '').trim())
    );
}

type GuarantorSeizureKind = 'salary' | 'movable' | 'property';

const ACTIONS: Array<{
    kind: GuarantorSeizureKind;
    gateKey: InlineActionGateKey;
    label: string;
    Icon: typeof Wallet;
}> = [
    {
        kind: 'salary',
        gateKey: 'seizure_guarantor_salary',
        label: 'حجز راتب الكفيل',
        Icon: Wallet,
    },
    {
        kind: 'movable',
        gateKey: 'seizure_guarantor_vehicle',
        label: 'حجز منقولات الكفيل',
        Icon: Package,
    },
    {
        kind: 'property',
        gateKey: 'seizure_guarantor_property',
        label: 'حجز عقار الكفيل',
        Icon: Building2,
    },
];

export function SeizureRequestsTabGuarantorSeizureActions(props: {
    disabled: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    requestGuarantorSeizure: (kind: GuarantorSeizureKind, opts?: { inline?: boolean }) => void;
}) {
    const { disabled, inlineActionGateKey, setInlineActionGateKey, requestGuarantorSeizure } = props;

    return (
        <div className="mt-2 space-y-2" dir="rtl">
            <p className="px-1 text-right text-[10px] font-bold text-slate-400">
                الكفيل معتمد — إجراءات الحجز على أموال الضامن
            </p>
            {ACTIONS.map(({ kind, gateKey, label, Icon }) => (
                <div key={kind} className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            if (disabled) return;
                            setInlineActionGateKey(gateKey);
                        }}
                        className={`flex w-full min-h-[44px] flex-row-reverse items-center gap-2 px-3 py-2 text-right text-[11px] font-bold text-slate-100 disabled:opacity-40 ${EXEC_MODAL_TOUCH_TARGET}`}
                    >
                        <Icon size={16} className="shrink-0 text-amber-200/80" />
                        <span className="min-w-0 flex-1">{label}</span>
                    </button>
                    <InlineActionGate
                        gateKey={gateKey}
                        activeKey={inlineActionGateKey}
                        variant="inline"
                        onConfirm={() => {
                            setInlineActionGateKey(null);
                            requestGuarantorSeizure(kind, { inline: true });
                        }}
                        onCancel={() => setInlineActionGateKey(null)}
                    />
                </div>
            ))}
        </div>
    );
}
