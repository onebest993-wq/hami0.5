import React from 'react';
import { DollarSign, User, Scale, Sparkles, Heart, Users } from 'lucide-react';
import { ecg } from './executionCreationGlassUi';
import { formatMoneyIntegerDisplay, handleMoneyInputChange } from '@/app/utils/moneyInput';

interface AlimonyCalculationResult {
    baseDurationMonths: number;
    baseDurationDays: number;
    baseAccumulation: number;
    pastDurationMonths: number;
    pastAccumulation: number;
    totalAccumulated: number;
    monthlyOngoing: number;
    legalCapApplied: boolean;
    explanation: string;
}

interface SmartAlimonyCalculatorProps {
    alimonyBeneficiary: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    alimonyLawsuitDate: string;
    alimonyExecutionDate: string;
    alimonyWifeMonthly: string;
    alimonyChildrenMonthly: string;
    alimonyChildrenCount: string;
    calculatedAlimonyNew: AlimonyCalculationResult | null;
    onBeneficiaryChange: (v: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد') => void;
    onLawsuitDateChange: (v: string) => void;
    onExecutionDateChange: (v: string) => void;
    onWifeMonthlyChange: (v: string) => void;
    onChildrenMonthlyChange: (v: string) => void;
    onChildrenCountChange: (v: string) => void;
}

const BENEFICIARY_OPTIONS: Array<{
    value: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    label: string;
    icon: React.ReactNode;
}> = [
    { value: 'زوجة فقط', label: 'زوجة فقط', icon: <Heart size={14} /> },
    { value: 'أولاد فقط', label: 'أولاد فقط', icon: <Users size={14} /> },
    { value: 'زوجة وأولاد', label: 'زوجة وأولاد', icon: <User size={14} /> },
];

const formatCurrency = formatMoneyIntegerDisplay;

const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    handleMoneyInputChange(e.target.value, setter);
};

export const SmartAlimonyCalculator: React.FC<SmartAlimonyCalculatorProps> = ({
    alimonyBeneficiary,
    alimonyLawsuitDate,
    alimonyExecutionDate,
    alimonyWifeMonthly,
    alimonyChildrenMonthly,
    alimonyChildrenCount,
    calculatedAlimonyNew,
    onBeneficiaryChange,
    onLawsuitDateChange,
    onExecutionDateChange,
    onWifeMonthlyChange,
    onChildrenMonthlyChange,
    onChildrenCountChange,
}) => {
    return (
        <div className={ecg.card}>
            <div className={ecg.cardHeader}>
                <h4 className={ecg.cardTitle}>
                    <Sparkles size={18} className="text-[#E6C673]" />
                    حاسبة النفقة الذكية
                </h4>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={ecg.labelGold}>
                        المستفيد من النفقة <span className="text-rose-400">*</span>
                    </label>
                    <div className={ecg.choiceRow} role="group" aria-label="المستفيد من النفقة">
                        {BENEFICIARY_OPTIONS.map((opt) => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onBeneficiaryChange(opt.value)}
                                className={`${ecg.choiceBtn} flex items-center justify-center gap-1.5 ${
                                    alimonyBeneficiary === opt.value ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                                }`}
                            >
                                <span className="opacity-80">{opt.icon}</span>
                                <span className="text-[11px] sm:text-xs">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className={ecg.label}>
                            تاريخ إقامة الدعوى <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={alimonyLawsuitDate}
                            onChange={(e) => onLawsuitDateChange(e.target.value)}
                            className={ecg.field}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                        />
                    </div>
                    <div>
                        <label className={ecg.label}>
                            تاريخ احتساب التنفيذ <span className="text-rose-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={alimonyExecutionDate}
                            onChange={(e) => onExecutionDateChange(e.target.value)}
                            className={ecg.field}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                        />
                    </div>
                </div>

                {(alimonyBeneficiary === 'زوجة فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
                    <div className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-950/25 to-[#0A0F1C]/30 backdrop-blur-sm p-4 space-y-3">
                        <h5 className={ecg.subCardTitle}>نفقة الزوجة</h5>
                        <div>
                            <label className={ecg.label}>
                                مقدار نفقة الزوجة الشهرية (دينار){' '}
                                <span className="text-rose-400">*</span>
                            </label>
                            <div className={`${ecg.moneyWrap} focus-within:border-rose-400/35 focus-within:ring-rose-400/10`}>
                                <DollarSign className="text-slate-500 flex-shrink-0" size={16} />
                                <input
                                    type="text"
                                    value={formatCurrency(alimonyWifeMonthly)}
                                    onChange={(e) => handleAmountChange(e, onWifeMonthlyChange)}
                                    className={ecg.moneyInput}
                                    placeholder="0"
                                />
                                <span className="text-slate-500 text-[10px] font-bold">IQD</span>
                            </div>
                        </div>
                    </div>
                )}

                {(alimonyBeneficiary === 'أولاد فقط' || alimonyBeneficiary === 'زوجة وأولاد') && (
                    <div className="rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-950/25 to-[#0A0F1C]/30 backdrop-blur-sm p-4 space-y-3">
                        <h5 className={ecg.subCardTitle}>نفقة الأولاد</h5>
                        <div>
                            <label className={ecg.label}>
                                مقدار نفقة الأولاد الشهرية (دينار){' '}
                                <span className="text-rose-400">*</span>
                            </label>
                            <div className={`${ecg.moneyWrap} focus-within:border-violet-400/35 focus-within:ring-violet-400/10`}>
                                <DollarSign className="text-slate-500 flex-shrink-0" size={16} />
                                <input
                                    type="text"
                                    value={formatCurrency(alimonyChildrenMonthly)}
                                    onChange={(e) => handleAmountChange(e, onChildrenMonthlyChange)}
                                    className={ecg.moneyInput}
                                    placeholder="0"
                                />
                                <span className="text-slate-500 text-[10px] font-bold">IQD</span>
                            </div>
                        </div>
                        <div>
                            <label className={ecg.label}>عدد الأولاد المحكوم لهم</label>
                            <input
                                type="number"
                                min={1}
                                value={alimonyChildrenCount}
                                onChange={(e) => onChildrenCountChange(e.target.value)}
                                className={ecg.field}
                            />
                        </div>
                    </div>
                )}

                {calculatedAlimonyNew && calculatedAlimonyNew.baseAccumulation > 0 ? (
                    <div className={ecg.resultCard}>
                        <h5 className="text-emerald-300/95 font-bold text-sm mb-3 flex items-center gap-2">
                            <Scale size={16} />
                            النتائج الفورية
                        </h5>
                        <div className="space-y-2 text-sm">
                            <div className="flex flex-row-reverse items-center justify-between gap-3">
                                <span className="text-slate-400 text-xs">المدة (أيام)</span>
                                <span className="text-white font-bold tabular-nums">
                                    {calculatedAlimonyNew.baseDurationDays} يوم
                                </span>
                            </div>
                            <div className="flex flex-row-reverse items-center justify-between gap-3">
                                <span className="text-slate-400 text-xs">المدة (أشهر)</span>
                                <span className="text-white font-bold tabular-nums">
                                    {calculatedAlimonyNew.baseDurationMonths.toFixed(1)} شهر
                                </span>
                            </div>
                            <div className="border-t border-emerald-500/15 pt-3 mt-2 space-y-2">
                                <div className="flex flex-row-reverse items-center justify-between gap-3">
                                    <span className="text-rose-200/90 font-bold text-xs">إجمالي النفقة المتراكمة</span>
                                    <span className="text-rose-300 font-black font-mono text-base tabular-nums">
                                        {formatCurrency(String(calculatedAlimonyNew.baseAccumulation))} د.ع
                                    </span>
                                </div>
                                <div className="flex flex-row-reverse items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2.5">
                                    <span className="text-emerald-200/90 font-bold text-[11px]">النفقة المستمرة (شهرياً)</span>
                                    <span className="text-emerald-300 font-black font-mono tabular-nums">
                                        +{formatCurrency(String(calculatedAlimonyNew.monthlyOngoing))} د.ع
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
