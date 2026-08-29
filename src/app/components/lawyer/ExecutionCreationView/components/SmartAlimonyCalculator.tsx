import React, { useMemo } from 'react';
import { Brain } from '@/app/components/ui/icons/Brain';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { ecg } from './executionCreationGlassUi';
import { formatMoneyIntegerDisplay, handleMoneyInputChange } from '@/app/utils/moneyInput';
import {
    analyzeAlimonyCreationContext,
    type AlimonyAnalysisSeverity,
} from '../hooks/analyzeAlimonyCreationContext';
import type { AlimonyCalculationResult } from '../hooks/useAlimonyCalculator';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

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
    judgmentDate?: string;
    docType?: string;
    claimType?: string;
    activeClaimTypes?: string[];
    submissionDate?: string;
    includesPastCalc?: boolean;
    alimonyPastStartDate?: string;
    todayYmd?: string;
}

const BENEFICIARY_OPTIONS: Array<{
    value: 'زوجة فقط' | 'أولاد فقط' | 'زوجة وأولاد';
    label: string;
}> = [
    { value: 'زوجة فقط', label: 'زوجة فقط' },
    { value: 'أولاد فقط', label: 'أولاد فقط' },
    { value: 'زوجة وأولاد', label: 'زوجة وأولاد' },
];

const formatCurrency = formatMoneyIntegerDisplay;

const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    handleMoneyInputChange(e.target.value, setter);
};

function severityClass(severity: AlimonyAnalysisSeverity): string {
    if (severity === 'critical') return 'border-rose-500/35 bg-rose-950/20';
    if (severity === 'warning') return 'border-amber-500/30 bg-amber-950/15';
    return 'border-[#E6C673]/20 bg-[#0A0F1C]/35';
}

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
    judgmentDate = '',
    docType = '',
    claimType = '',
    activeClaimTypes = [],
    submissionDate = '',
    includesPastCalc = false,
    alimonyPastStartDate = '',
    todayYmd,
}) => {
    const today = todayYmd ?? getLocalTodayYmd();

    const analysis = useMemo(
        () =>
            analyzeAlimonyCreationContext({
                alimonyBeneficiary,
                alimonyLawsuitDate,
                alimonyExecutionDate,
                alimonyWifeMonthly,
                alimonyChildrenMonthly,
                alimonyChildrenCount,
                calculatedAlimonyNew,
                includesPastCalc,
                alimonyPastStartDate,
                judgmentDate,
                docType,
                claimType,
                activeClaimTypes,
                submissionDate,
                todayYmd: today,
            }),
        [
            alimonyBeneficiary,
            alimonyLawsuitDate,
            alimonyExecutionDate,
            alimonyWifeMonthly,
            alimonyChildrenMonthly,
            alimonyChildrenCount,
            calculatedAlimonyNew,
            includesPastCalc,
            alimonyPastStartDate,
            judgmentDate,
            docType,
            claimType,
            activeClaimTypes,
            submissionDate,
            today,
        ],
    );

    const applyRecommendation = (field: 'lawsuitDate' | 'executionDate', value: string) => {
        if (field === 'lawsuitDate') onLawsuitDateChange(value);
        else onExecutionDateChange(value);
    };

    const showResults =
        calculatedAlimonyNew &&
        (calculatedAlimonyNew.baseAccumulation > 0 ||
            calculatedAlimonyNew.pastAccumulation > 0 ||
            calculatedAlimonyNew.monthlyOngoing > 0 ||
            analysis.projectedAccumulatedIqd != null);

    return (
        <div className={ecg.card}>
            <div className={ecg.cardHeader}>
                <h4 className={ecg.cardTitle}>
                    <Sparkles size={18} className="text-[#E6C673]" />
                    حاسبة النفقة الذكية
                </h4>
                <p className={ecg.cardSubtitle}>تحليل سياقي — يقرأ العلاقة بين التواريخ والمطالبات والمبالغ</p>
            </div>

            <div className="space-y-4">
                <div
                    className="rounded-xl border border-[#E6C673]/25 bg-[#05060D]/40 p-4 space-y-3"
                    role="region"
                    aria-label="تحليل السياق"
                    aria-live="polite"
                >
                    <div className="flex items-center justify-between gap-2 flex-row-reverse">
                        <div className="flex items-center gap-2 text-[#E6C673]">
                            <Brain size={16} />
                            <span className="text-xs font-bold">تحليل السياق</span>
                        </div>
                        <span className="text-[10px] text-slate-500 tabular-nums">
                            اكتمال {analysis.completeness}% · تماسك {analysis.coherenceScore}%
                        </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-300 text-right">{analysis.synthesis}</p>
                    <p className="text-[10px] text-slate-500 text-right border-t border-white/5 pt-2">
                        {analysis.timelineNarrative}
                    </p>

                    {analysis.findings.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 text-right">ملاحظات مستخرجة</p>
                            {analysis.findings.map((f) => (
                                <div
                                    key={f.id}
                                    className={`rounded-lg border p-2.5 ${severityClass(f.severity)}`}
                                >
                                    <p className="text-[11px] text-slate-200 text-right">{f.observation}</p>
                                    {f.evidence.length > 0 ? (
                                        <ul className="mt-1 space-y-0.5">
                                            {f.evidence.map((e) => (
                                                <li key={e} className="text-[10px] text-slate-500 text-right">
                                                    — {e}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {analysis.inferences.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 text-right">استنتاجات</p>
                            {analysis.inferences.map((inf) => (
                                <div
                                    key={inf.id}
                                    className="rounded-lg border border-white/8 bg-white/[0.02] p-2.5"
                                >
                                    <p className="text-[11px] text-slate-200 text-right">{inf.conclusion}</p>
                                    <ul className="mt-1 space-y-0.5">
                                        {inf.because.map((b) => (
                                            <li key={b} className="text-[10px] text-slate-500 text-right">
                                                • {b}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {analysis.recommendations.length > 0 ? (
                        <div className="space-y-2 border-t border-white/5 pt-2">
                            <p className="text-[10px] font-bold text-slate-400 text-right">مقترحات مبررة</p>
                            {analysis.recommendations.map((rec) => (
                                <div key={rec.id} className="text-right">
                                    <p className="text-[11px] text-emerald-200/90">{rec.action}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{rec.rationale}</p>
                                    {rec.apply ? (
                                        <button
                                            type="button"
                                            className="text-[10px] text-[#E6C673] mt-1 hover:underline"
                                            onClick={() =>
                                                applyRecommendation(rec.apply!.field, rec.apply!.value)
                                            }
                                        >
                                            تطبيق المقترح
                                        </button>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

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
                                className={`${ecg.choiceBtn} flex items-center justify-center ${
                                    alimonyBeneficiary === opt.value ? ecg.choiceBtnActive : ecg.choiceBtnIdle
                                }`}
                            >
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
                            aria-invalid={analysis.insights.status === 'missing_lawsuit_date'}
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
                            aria-invalid={analysis.insights.status === 'execution_before_lawsuit'}
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
                                <input
                                    type="text"
                                    value={formatCurrency(alimonyWifeMonthly)}
                                    onChange={(e) => handleAmountChange(e, onWifeMonthlyChange)}
                                    className={ecg.moneyInput}
                                    aria-label="مقدار نفقة الزوجة الشهرية (دينار)"
                                />
                                <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
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
                                <input
                                    type="text"
                                    value={formatCurrency(alimonyChildrenMonthly)}
                                    onChange={(e) => handleAmountChange(e, onChildrenMonthlyChange)}
                                    className={ecg.moneyInput}
                                    aria-label="مقدار نفقة الأولاد الشهرية (دينار)"
                                />
                                <span className="text-slate-500 text-[10px] font-bold shrink-0">د.ع</span>
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

                {showResults && calculatedAlimonyNew ? (
                    <div className={ecg.resultCard}>
                        <h5 className="text-emerald-300/95 font-bold text-sm mb-3 flex items-center gap-2">
                            <Scale size={16} />
                            نتائج محرك الحاسبة
                        </h5>
                        <div className="space-y-2 text-sm">
                            {analysis.insights.daysBetween != null && analysis.insights.isExecutionAfterLawsuit ? (
                                <div className="flex flex-row-reverse items-center justify-between gap-3">
                                    <span className="text-slate-400 text-xs">المدة (أيام)</span>
                                    <span className="text-white font-bold tabular-nums">
                                        {analysis.insights.daysBetween} يوم
                                    </span>
                                </div>
                            ) : null}
                            {calculatedAlimonyNew.baseAccumulation > 0 ? (
                                <div className="flex flex-row-reverse items-center justify-between gap-3">
                                    <span className="text-rose-200/90 font-bold text-xs">المتراكم الأساسي</span>
                                    <span className="text-rose-300 font-black font-mono tabular-nums">
                                        {formatCurrency(String(calculatedAlimonyNew.baseAccumulation))} د.ع
                                    </span>
                                </div>
                            ) : null}
                            {calculatedAlimonyNew.monthlyOngoing > 0 ? (
                                <div className="flex flex-row-reverse items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-950/30 px-3 py-2.5">
                                    <span className="text-emerald-200/90 font-bold text-[11px]">شهرياً مستمرة</span>
                                    <span className="text-emerald-300 font-black font-mono tabular-nums">
                                        +{formatCurrency(String(calculatedAlimonyNew.monthlyOngoing))} د.ع
                                    </span>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};
