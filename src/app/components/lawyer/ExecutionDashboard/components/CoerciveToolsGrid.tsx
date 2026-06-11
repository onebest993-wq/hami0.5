import React from 'react';
import { CheckCircle, Wallet, FolderOpen } from 'lucide-react';
import { InlineActionGate } from './InlineActionGate';
import type { InlineActionGateKey } from '../types';

export interface CoerciveToolsGridProps {
    isEvictionExecutionModule: boolean;
    activeDebtorIsEmployee: boolean;
    executionCoerciveButtonDisabled: boolean;
    activeCoerciveActions: string[];
    inlineActionGateKey: InlineActionGateKey | null;
    followupSalarySeizureLabel: string;
    followupGarnishmentAmountPreview: string | number | null | undefined;
    followupEmployeeFinancialSalaryOnlyCoercive: boolean;
    followupMonetaryCoerciveLimitedOnly: boolean;
    hideCoerciveSeizureSalaryAndProperty?: boolean;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    handleCoerciveAction: (type: string) => void;
}

export const CoerciveToolsGrid: React.FC<CoerciveToolsGridProps> = ({
    isEvictionExecutionModule,
    activeDebtorIsEmployee,
    executionCoerciveButtonDisabled,
    activeCoerciveActions,
    inlineActionGateKey,
    followupSalarySeizureLabel,
    followupGarnishmentAmountPreview,
    followupEmployeeFinancialSalaryOnlyCoercive,
    followupMonetaryCoerciveLimitedOnly,
    hideCoerciveSeizureSalaryAndProperty = false,
    setInlineActionGateKey,
    handleCoerciveAction,
}) => {
    const renderSeizureButton = ({
        type,
        label,
        icon: Icon,
        gateKey,
    }: {
        type: string;
        label: string;
        icon: React.ElementType;
        gateKey: InlineActionGateKey;
    }) => (
        <div className="relative">
            <button
                type="button"
                onClick={() => {
                    if (executionCoerciveButtonDisabled) return;
                    setInlineActionGateKey(gateKey);
                }}
                disabled={executionCoerciveButtonDisabled}
                className={`w-full backdrop-blur-xl rounded-2xl p-4 transition-all relative ${
                    executionCoerciveButtonDisabled
                        ? 'bg-slate-900/40 opacity-50 cursor-not-allowed'
                        : 'bg-slate-800/60 hover:bg-slate-700/60'
                }`}
            >
                {activeCoerciveActions.includes(type) && (
                    <CheckCircle size={14} className="absolute top-2 right-2 text-emerald-400" />
                )}
                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 mx-auto mb-2">
                    <Icon className="w-6 h-6 text-white/70" />
                </div>
                <p className={`font-semibold text-xs text-center ${executionCoerciveButtonDisabled ? 'text-gray-600' : 'text-white'}`}>
                    {label}
                </p>
            </button>
            <InlineActionGate
                gateKey={gateKey}
                activeKey={inlineActionGateKey}
                onConfirm={() => handleCoerciveAction(type)}
                onCancel={() => setInlineActionGateKey(null)}
            />
        </div>
    );

    if (isEvictionExecutionModule) return null;

    const showSalaryButton = activeDebtorIsEmployee && !hideCoerciveSeizureSalaryAndProperty;
    const showPropertyButton = !hideCoerciveSeizureSalaryAndProperty;

    if (!showSalaryButton && !showPropertyButton) return null;

    return (
        <>
            <div className="grid grid-cols-2 gap-3">
                {showSalaryButton && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => {
                                if (executionCoerciveButtonDisabled) return;
                                setInlineActionGateKey('seizure_salary');
                            }}
                            disabled={executionCoerciveButtonDisabled}
                            className={`w-full backdrop-blur-xl rounded-2xl p-4 transition-all ${
                                executionCoerciveButtonDisabled
                                    ? 'bg-slate-900/40 opacity-50 cursor-not-allowed'
                                    : 'bg-slate-800/60 hover:bg-slate-700/60'
                            }`}
                        >
                            {activeCoerciveActions.includes('salary') && (
                                <CheckCircle size={14} className="absolute top-2 right-2 text-emerald-400" />
                            )}
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 mx-auto mb-2">
                                <Wallet className="w-6 h-6 text-white/70" />
                            </div>
                            <p className={`font-semibold text-xs text-center ${executionCoerciveButtonDisabled ? 'text-gray-600' : 'text-white'}`}>
                                {followupSalarySeizureLabel}
                            </p>
                            {(() => {
                                if (executionCoerciveButtonDisabled) return null;
                                const n = Number(followupGarnishmentAmountPreview);
                                if (!Number.isFinite(n) || n <= 0) return null;
                                return (
                                    <p className="text-amber-400 text-[10px] font-bold text-center mt-1" dir="ltr">
                                        {Math.trunc(n).toLocaleString('ar-IQ')} د.ع/شهرياً
                                    </p>
                                );
                            })()}
                        </button>
                        <InlineActionGate
                            gateKey="seizure_salary"
                            activeKey={inlineActionGateKey}
                            onConfirm={() => handleCoerciveAction('salary')}
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    </div>
                )}

                {showPropertyButton &&
                    renderSeizureButton({ type: 'property', label: 'طلب حجز عقار', icon: FolderOpen, gateKey: 'seizure_property' })}
            </div>
        </>
    );
};
