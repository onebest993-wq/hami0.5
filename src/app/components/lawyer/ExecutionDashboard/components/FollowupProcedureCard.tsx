import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import { RequestLifecycleBadgeSlot, RequestLifecyclePanel } from './RequestLifecycleBadge';
import type { InlineActionGateKey } from '../types';
import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';

const HEADER_BTN =
    'w-full text-right rounded-2xl px-4 py-3.5 transition-all border backdrop-blur-xl bg-[#0A1122]/70 border-white/5 hover:border-[#E6C673]/35';

export type FollowupProcedureConfirmOpts = { resubmit?: boolean };

export interface FollowupProcedureCardProps {
    label: string;
    icon: React.ReactNode;
    subtitle?: string;
    gateKey: InlineActionGateKey;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    onConfirmSend: (opts?: FollowupProcedureConfirmOpts) => void;
    hasActiveRequest: boolean;
    expanded: boolean;
    onToggleExpanded: () => void;
    disabled?: boolean;
    panelBody?: React.ReactNode;
    toneClass?: string;
    workflowComplete?: boolean;
    resubmitWarningMessage?: string;
    lifecycleSummary?: ExecutorRequestLifecycleSummary | null;
    sendGateContent?: React.ReactNode;
    sendGateConfirmDisabled?: boolean;
}

export const FollowupProcedureCard: React.FC<FollowupProcedureCardProps> = ({
    label,
    icon,
    subtitle,
    gateKey,
    inlineActionGateKey,
    setInlineActionGateKey,
    onConfirmSend,
    hasActiveRequest,
    expanded,
    onToggleExpanded,
    disabled = false,
    panelBody,
    toneClass = '',
    workflowComplete = false,
    resubmitWarningMessage,
    lifecycleSummary = null,
    sendGateContent,
    sendGateConfirmDisabled = false,
}) => {
    const [lifecycleOpen, setLifecycleOpen] = useState(false);
    const inProgress = hasActiveRequest && !workflowComplete;
    const panelOpen = inProgress && expanded;
    const showGate = !inProgress;
    const showLifecycleBadge = Boolean(lifecycleSummary && lifecycleSummary.submissions > 0);

    const handleHeaderClick = () => {
        if (disabled) return;
        if (inProgress) {
            setLifecycleOpen(false);
            onToggleExpanded();
            return;
        }
        setLifecycleOpen(false);
        setInlineActionGateKey(gateKey);
    };

    const handleConfirmSend = () => {
        onConfirmSend(workflowComplete ? { resubmit: true } : undefined);
    };

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                panelOpen ? 'overflow-visible' : ''
            }`}
        >
            <button
                type="button"
                disabled={disabled && !hasActiveRequest && !workflowComplete}
                aria-expanded={inProgress ? panelOpen : undefined}
                onClick={handleHeaderClick}
                className={`${HEADER_BTN} rounded-none border-0 ${toneClass} ${
                    disabled && !hasActiveRequest && !workflowComplete
                        ? 'opacity-45 cursor-not-allowed hover:border-white/5'
                        : ''
                }`}
            >
                <div className="flex flex-row-reverse items-center gap-3">
                    {icon}
                    <div className="flex-1 min-w-0 text-right">
                        <p className="text-white font-bold text-sm">{label}</p>
                        {!workflowComplete && subtitle ? (
                            <p className="text-slate-500 text-[10px] mt-0.5">{subtitle}</p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {showLifecycleBadge && lifecycleSummary ? (
                            <RequestLifecycleBadgeSlot
                                summary={lifecycleSummary}
                                expanded={lifecycleOpen}
                                onToggle={() => setLifecycleOpen((v) => !v)}
                            />
                        ) : null}
                        {inProgress ? (
                            <span
                                className="inline-flex shrink-0 items-center justify-center rounded-md p-0.5"
                                aria-hidden
                            >
                                <ChevronDown
                                    size={18}
                                    strokeWidth={2}
                                    className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${
                                        panelOpen ? 'rotate-180' : ''
                                    }`}
                                />
                            </span>
                        ) : null}
                    </div>
                </div>
            </button>

            {lifecycleOpen && lifecycleSummary ? (
                <RequestLifecyclePanel summary={lifecycleSummary} />
            ) : null}

            {showGate ? (
                <InlineActionGate
                    gateKey={gateKey}
                    activeKey={inlineActionGateKey}
                    mode={workflowComplete ? 'resubmit_warning' : 'initial'}
                    warningMessage={resubmitWarningMessage}
                    onConfirm={handleConfirmSend}
                    onCancel={() => setInlineActionGateKey(null)}
                    confirmDisabled={sendGateConfirmDisabled}
                    variant={sendGateContent ? 'inline' : 'overlay'}
                >
                    {sendGateContent}
                </InlineActionGate>
            ) : null}

            {panelOpen && panelBody ? (
                <div className="border-t border-white/10">{panelBody}</div>
            ) : null}
        </div>
    );
};
