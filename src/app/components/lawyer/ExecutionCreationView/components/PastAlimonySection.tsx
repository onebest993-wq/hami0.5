import React from 'react';
import { DollarSign, Zap, Scale, AlertTriangle } from 'lucide-react';
import { ecg } from './executionCreationGlassUi';
import type { AlimonyPastLawSystem } from '../hooks/useAlimonyCalculator';

export interface PastAlimonyCalculationSlice {
    pastDurationDays: number;
    pastDurationMonths: number;
    pastDurationMonthsRaw: number;
    pastYearCapApplied: boolean;
    pastAccumulation: number;
    pastMonthlyUsed: number;
    legalCapApplied?: boolean;
    explanation?: string;
}

interface PastAlimonyFieldsSectionProps {
    alimonyPastLawSystem: AlimonyPastLawSystem;
    alimonyPastStartDate: string;
    alimonyLawsuitDate: string;
    alimonyPastWifeMonthly: string;
    fallbackWifeMonthly?: string;
    onPastLawSystemChange: (v: AlimonyPastLawSystem) => void;
    onPastStartDateChange: (v: string) => void;
    onLawsuitDateChange: (v: string) => void;
    onPastWifeMonthlyChange: (v: string) => void;
    calculated?: PastAlimonyCalculationSlice | null;
}

const formatCurrency = (value: string) => {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (!isNaN(Number(rawValue))) {
        setter(rawValue);
    }
};

export const PastAlimonyFieldsSection: React.FC<PastAlimonyFieldsSectionProps> = ({
    alimonyPastLawSystem,
    alimonyPastStartDate,
    alimonyLawsuitDate,
    alimonyPastWifeMonthly,
    fallbackWifeMonthly = '',
    onPastLawSystemChange,
    onPastStartDateChange,
    onLawsuitDateChange,
    onPastWifeMonthlyChange,
    calculated,
}) => (
    <div className={`${ecg.callout} space-y-3`}>
        <div className="flex items-center gap-2 flex-row-reverse">
            <Zap className="text-[#E6C673]/90" size={16} />
            <h6 className="text-[#F0DFA8] font-bold text-xs">القانون المطبق على النفقة الماضية</h6>
        </div>
        <p className={ecg.hintText}>
            يُحتسب المبلغ من <span className="font-bold">تاريخ الاستحقاق</span> حتى{' '}
            <span className="font-bold">تاريخ إقامة الدعوى</span> (÷ 30 يوماً للشهر)
        </p>
        <div>
            <label className={ecg.label}>القانون المطبق على العقد *</label>
            <select
                value={alimonyPastLawSystem}
                onChange={(e) =>
                    onPastLawSystemChange(e.target.value as AlimonyPastLawSystem)
                }
                className={ecg.field}
            >
                <option value="قانون الأحوال الشخصية 1959">
                    قانون الأحوال الشخصية 1959 (حد أقصى سنة واحدة)
                </option>
                <option value="الفقه الجعfري">الفقه الجعfري (بدون حد أقصى)</option>
            </select>
        </div>
        <div>
            <label className={ecg.label}>تاريخ استحقاق النفقة الماضية *</label>
            <input
                type="date"
                value={alimonyPastStartDate}
                onChange={(e) => onPastStartDateChange(e.target.value)}
                className={ecg.field}
                style={{ direction: 'ltr', textAlign: 'right' }}
            />
        </div>
        <div>
            <label className={ecg.label}>
                تاريخ إقامة الدعوى *{' '}
                <span className="text-[10px] font-normal text-slate-500">(نهاية احتساب النفقة الماضية)</span>
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
                مقدار نفقة الزوجة الشهرية للنفقة الماضية (دينار){' '}
                <span className="text-rose-400">*</span>
            </label>
            <div className={ecg.moneyWrap}>
                <DollarSign className="text-slate-500 flex-shrink-0" size={16} />
                <input
                    type="text"
                    value={formatCurrency(alimonyPastWifeMonthly)}
                    onChange={(e) => handleAmountChange(e, onPastWifeMonthlyChange)}
                    className={ecg.moneyInput}
                    placeholder={formatCurrency(fallbackWifeMonthly) || '0'}
                />
                <span className="text-slate-500 text-xs">د.ع/شهر</span>
            </div>
            {!alimonyPastWifeMonthly && fallbackWifeMonthly ? (
                <p className="mt-1.5 text-[10px] text-slate-500 text-right">
                    إن تُرك فارغاً يُستخدم مقدار نفقة الزوجة الحالية (
                    {formatCurrency(fallbackWifeMonthly)} د.ع)
                </p>
            ) : null}
        </div>
        {calculated?.legalCapApplied && calculated.explanation ? (
            <div className={ecg.hintDangerInline}>
                <p className="text-rose-300 text-[10px] font-bold flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {calculated.explanation}
                </p>
            </div>
        ) : null}
    </div>
);

interface PastAlimonyResultPreviewProps {
    calculated: PastAlimonyCalculationSlice | null | undefined;
    pastLawSystem: AlimonyPastLawSystem;
    /** embedded = داخل حاسبة النفقة | standalone = مطالبة نفقة ماضية منفصلة */
    variant?: 'embedded' | 'standalone';
}

export const PastAlimonyResultPreview: React.FC<PastAlimonyResultPreviewProps> = ({
    calculated,
    pastLawSystem,
    variant = 'embedded',
}) => {
    if (!calculated || calculated.pastAccumulation <= 0) return null;

    const totalLabel = variant === 'standalone' ? 'إجمالي النفقة الماضية' : 'إجمالي المطالبة';

    return (
        <div className={ecg.resultCard}>
            <h5 className="text-emerald-300/95 font-bold text-sm mb-3 flex items-center gap-2">
                <Scale size={16} />
                النتائج الفورية
            </h5>
            <div className="space-y-3 text-sm">
                {calculated.pastDurationDays > 0 ? (
                    <div className={`${ecg.hintPanel} !mt-0 px-2.5 py-2`}>
                        <span className="text-slate-500 block">مدة النفقة الماضية</span>
                        <span className="text-[#F0DFA8] font-bold">{calculated.pastDurationDays} يوم</span>
                        <span className="text-[#E6C673]/80">
                            {' '}
                            ({calculated.pastDurationMonths.toFixed(1)} شهر)
                        </span>
                    </div>
                ) : null}

                <div className={`${ecg.hintPanel} space-y-2`}>
                    <p className="text-[#F0DFA8] text-xs font-bold text-right">النفقة الماضية</p>
                    <div className="flex items-center justify-between gap-2 rounded-lg bg-black/20 px-2.5 py-2">
                        <div>
                            <span className="text-amber-200 font-bold font-mono tabular-nums block">
                                {formatCurrency(String(calculated.pastAccumulation))} د.ع
                            </span>
                            <span className="text-[10px] text-slate-500">
                                ({formatCurrency(String(calculated.pastMonthlyUsed))} ÷ 30) ×{' '}
                                {calculated.pastDurationDays} يوم ={' '}
                                {calculated.pastDurationMonths.toFixed(1)} شهر
                            </span>
                        </div>
                        <span className="text-slate-300 text-xs text-right leading-relaxed">
                            للزوجة
                            {calculated.pastYearCapApplied ? (
                                <span className="block text-[10px] text-amber-400/90">
                                    حد سنة (1959) — فعلياً {calculated.pastDurationMonthsRaw.toFixed(1)} شهر
                                </span>
                            ) : pastLawSystem === 'الفقه الجعfري' ? (
                                <span className="block text-[10px] text-amber-400/90">
                                    فقه جعfري — {calculated.pastDurationMonthsRaw.toFixed(1)} شهر
                                </span>
                            ) : null}
                        </span>
                    </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/8 px-3 py-3">
                    <span className="text-[#F0DFA8] font-black font-mono text-lg tabular-nums">
                        {formatCurrency(String(calculated.pastAccumulation))} د.ع
                    </span>
                    <span className="text-[#E6C673] text-sm font-bold text-right leading-snug">
                        {totalLabel}
                        {variant === 'embedded' ? (
                            <span className="block text-[10px] font-normal text-slate-400 mt-0.5">
                                متراكمة + ماضية
                            </span>
                        ) : null}
                    </span>
                </div>
            </div>
        </div>
    );
};
