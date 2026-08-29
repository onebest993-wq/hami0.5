import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Clock } from '@/app/components/ui/icons/Clock';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Users } from '@/app/components/ui/icons/Users';

export interface AlimonyFinancialBreakdown {
    baseAccumulation: number;
    wifeBaseAccumulation: number;
    childrenBaseAccumulation: number;
    baseDurationDays: number;
    baseDurationMonths: number;
    pastAccumulation: number;
    pastWifeAccumulation: number;
    pastChildrenAccumulation: number;
    pastDurationDays: number;
    pastDurationMonths: number;
    totalAccumulated: number;
}

interface AlimonyFinancialBlockProps {
    breakdown?: AlimonyFinancialBreakdown;
    wifeMonthlyAlimony: number;
    childrenMonthlyAlimony: number;
    childrenCount: number;
    totalMonthlyAlimony?: number;
    daysRemainingInCycle?: number;
    showWife?: boolean;
    showChildren?: boolean;
    showCycleTracker?: boolean;
    showGrandTotal?: boolean;
    /** عرض أسطر الاستحقاق الشهري فقط — بدون مجموعات أو حاويات ثقيلة */
    entitlementsOnly?: boolean;
    /** مطالبة «نفقة ماضية» منفصلة — إخفاء المستمرة والمتراكمة وزر الاستحقاق الشهري */
    pastAlimonyOnly?: boolean;
}

export const AlimonyFinancialBlock = React.memo<AlimonyFinancialBlockProps>((props) => {
    const {
        breakdown,
        wifeMonthlyAlimony,
        childrenMonthlyAlimony,
        childrenCount,
        totalMonthlyAlimony = 0,
        daysRemainingInCycle = 15,
        showWife = wifeMonthlyAlimony > 0 || (breakdown?.wifeBaseAccumulation ?? 0) > 0,
        showChildren = childrenMonthlyAlimony > 0 || (breakdown?.childrenBaseAccumulation ?? 0) > 0,
        showCycleTracker = false,
        showGrandTotal = false,
        entitlementsOnly = false,
        pastAlimonyOnly = false,
    } = props;

    const formatCurrency = React.useCallback(
        (amount: number) => amount.toLocaleString('ar-IQ'),
        [],
    );

    if (entitlementsOnly) {
        const hasAny =
            (showWife && wifeMonthlyAlimony > 0) || (showChildren && childrenMonthlyAlimony > 0);
        if (!hasAny) {
            return (
                <p className="text-center text-xs text-slate-500 py-4">لا توجد استحقاقات شهرية مسجّلة</p>
            );
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="divide-y divide-white/[0.06]"
            >
                {showWife && wifeMonthlyAlimony > 0 ? (
                    <div className="flex items-center justify-between gap-3 py-3 px-0.5">
                        <span className="text-emerald-300/95 font-bold font-mono tabular-nums text-sm">
                            {formatCurrency(wifeMonthlyAlimony)}
                            <span className="text-[10px] text-slate-500 font-normal mr-1">/ شهر</span>
                        </span>
                        <span className="text-slate-400 text-xs">استحقاق الزوجة</span>
                    </div>
                ) : null}
                {showChildren && childrenMonthlyAlimony > 0 ? (
                    <div className="flex items-center justify-between gap-3 py-3 px-0.5">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-300/95 font-bold font-mono tabular-nums text-sm">
                                {formatCurrency(childrenMonthlyAlimony * childrenCount)}
                                <span className="text-[10px] text-slate-500 font-normal mr-1">/ شهر</span>
                            </span>
                            <span className="text-[10px] text-slate-500 tabular-nums">
                                ({formatCurrency(childrenMonthlyAlimony)} × {childrenCount})
                            </span>
                        </div>
                        <span className="text-slate-400 text-xs shrink-0">استحقاق الأولاد</span>
                    </div>
                ) : null}
            </motion.div>
        );
    }

    const hasBase =
        !pastAlimonyOnly &&
        ((breakdown?.baseAccumulation ?? 0) > 0 || (breakdown?.baseDurationDays ?? 0) > 0);
    const hasPast = (breakdown?.pastAccumulation ?? 0) > 0;
    const showOngoingSection =
        !pastAlimonyOnly &&
        ((showWife && wifeMonthlyAlimony > 0) ||
            (showChildren && childrenMonthlyAlimony > 0) ||
            totalMonthlyAlimony > 0 ||
            showCycleTracker);

    return (
        <div className="space-y-4">
            {showOngoingSection ? (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="backdrop-blur-xl bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-3"
            >
                <div className="flex items-center justify-end gap-2 mb-2">
                    <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
                    <Clock size={16} className="text-emerald-400" />
                    <h4 className="text-emerald-400 font-bold text-sm">النفقة المستمرة</h4>
                </div>

                {showWife && wifeMonthlyAlimony > 0 ? (
                    <div className="flex items-center justify-between bg-slate-900/40 border border-emerald-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-300 font-bold text-base">
                                {formatCurrency(wifeMonthlyAlimony)}
                            </span>
                            <span className="text-emerald-500/70 text-[10px]">/ شهرياً</span>
                        </div>
                        <span className="text-gray-300 text-xs">استحقاق الزوجة</span>
                    </div>
                ) : null}

                {showChildren && childrenMonthlyAlimony > 0 ? (
                    <div className="flex items-center justify-between bg-slate-900/40 border border-emerald-500/20 rounded-lg p-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-300 font-bold text-base">
                                {formatCurrency(childrenMonthlyAlimony * childrenCount)}
                            </span>
                            <span className="text-emerald-500/70 text-[10px]">/ شهرياً</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-xs">استحقاق الأولاد</span>
                            <div className="flex items-center gap-1 bg-purple-500/20 border border-purple-400/30 rounded px-2 py-0.5">
                                <Users size={10} className="text-purple-300" />
                                <span className="text-purple-300 text-[10px] font-bold">{childrenCount}</span>
                            </div>
                        </div>
                    </div>
                ) : null}

                {totalMonthlyAlimony > 0 ? (
                    <>
                        <div className="h-px bg-gradient-to-r from-transparent via-emerald-600 to-transparent" />
                        <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-black text-xl">
                                    {formatCurrency(totalMonthlyAlimony)}
                                </span>
                                <span className="text-emerald-500/70 text-xs">د.ع</span>
                            </div>
                            <span className="text-emerald-300 text-sm font-semibold">الإجمالي الشهري المطلوب</span>
                        </div>
                    </>
                ) : null}

                {showCycleTracker ? (
                    <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-end gap-2">
                            <div className="flex items-center gap-1.5">
                                <span className="text-indigo-400 font-bold text-sm">{daysRemainingInCycle}</span>
                                <span className="text-indigo-500/70 text-[10px]">يوم متبقي</span>
                            </div>
                            <Clock size={12} className="text-indigo-400" />
                            <span className="text-indigo-300 text-xs">دورة الاستحقاق الحالية</span>
                        </div>
                    </div>
                ) : null}
            </motion.div>
            ) : null}

            {hasBase && breakdown ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="backdrop-blur-xl bg-rose-950/30 border-2 border-rose-500/40 rounded-2xl p-4 space-y-3"
                >
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <div className="h-px flex-1 bg-gradient-to-l from-rose-500/30 to-transparent" />
                        <Scale size={16} className="text-rose-400" />
                        <h4 className="text-rose-400 font-bold text-sm">النفقة المتراكمة (الدعوى → التنفيذ)</h4>
                    </div>

                    {breakdown.baseDurationDays > 0 ? (
                        <p className="text-[10px] text-slate-400 text-right">
                            المدة:{' '}
                            <span className="text-rose-200 font-bold">{breakdown.baseDurationDays} يوم</span>
                            <span className="text-slate-500">
                                {' '}
                                ({breakdown.baseDurationMonths.toFixed(1)} شهر)
                            </span>
                        </p>
                    ) : null}

                    {showWife && breakdown.wifeBaseAccumulation > 0 ? (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-rose-500/20 rounded-lg p-2.5">
                            <span className="text-rose-300 font-bold text-base">
                                {formatCurrency(breakdown.wifeBaseAccumulation)}
                            </span>
                            <span className="text-gray-300 text-xs">متراكمة — الزوجة</span>
                        </div>
                    ) : null}

                    {showChildren && breakdown.childrenBaseAccumulation > 0 ? (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-rose-500/20 rounded-lg p-2.5">
                            <span className="text-rose-300 font-bold text-base">
                                {formatCurrency(breakdown.childrenBaseAccumulation)}
                            </span>
                            <span className="text-gray-300 text-xs">متراكمة — الأولاد</span>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between bg-rose-900/30 border border-rose-500/30 rounded-lg p-3">
                        <span className="text-rose-400 font-black text-xl">
                            {formatCurrency(breakdown.baseAccumulation)}
                        </span>
                        <span className="text-rose-300 text-sm font-semibold">مجموع المتراكمة</span>
                    </div>
                </motion.div>
            ) : null}

            {hasPast && breakdown ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="backdrop-blur-xl bg-amber-950/25 border-2 border-amber-500/35 rounded-2xl p-4 space-y-3"
                >
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <div className="h-px flex-1 bg-gradient-to-l from-amber-500/30 to-transparent" />
                        <Calendar size={16} className="text-amber-400" />
                        <h4 className="text-amber-400 font-bold text-sm">النفقة الماضية</h4>
                    </div>

                    {breakdown.pastDurationDays > 0 ? (
                        <p className="text-[10px] text-slate-400 text-right">
                            المدة:{' '}
                            <span className="text-amber-200 font-bold">{breakdown.pastDurationDays} يوم</span>
                            <span className="text-amber-300/70">
                                {' '}
                                ({breakdown.pastDurationMonths.toFixed(1)} شهر)
                            </span>
                        </p>
                    ) : null}

                    {breakdown.pastWifeAccumulation > 0 ? (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-amber-500/20 rounded-lg p-2.5">
                            <span className="text-amber-200 font-bold text-base">
                                {formatCurrency(breakdown.pastWifeAccumulation)}
                            </span>
                            <span className="text-gray-300 text-xs">نفقة زوجة ماضية</span>
                        </div>
                    ) : null}

                    {breakdown.pastChildrenAccumulation > 0 ? (
                        <div className="flex items-center justify-between bg-slate-900/40 border border-amber-500/20 rounded-lg p-2.5">
                            <span className="text-amber-200 font-bold text-base">
                                {formatCurrency(breakdown.pastChildrenAccumulation)}
                            </span>
                            <span className="text-gray-300 text-xs">نفقة أولاد ماضية</span>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between bg-amber-900/25 border border-amber-500/30 rounded-lg p-3">
                        <span className="text-amber-300 font-black text-xl">
                            {formatCurrency(breakdown.pastAccumulation)}
                        </span>
                        <span className="text-amber-200/90 text-sm font-semibold">مجموع الماضية</span>
                    </div>
                </motion.div>
            ) : null}

            {showGrandTotal && breakdown && breakdown.totalAccumulated > 0 ? (
                <div className="flex items-center justify-between rounded-2xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-4 py-3">
                    <span className="text-[#F0DFA8] font-black text-xl tabular-nums">
                        {formatCurrency(breakdown.totalAccumulated)} د.ع
                    </span>
                    <span className="text-[#E6C673] text-sm font-bold text-right leading-snug">
                        {pastAlimonyOnly
                            ? 'إجمالي النفقة الماضية'
                            : 'إجمالي الوعاء (متراكمة + ماضية)'}
                    </span>
                </div>
            ) : null}
        </div>
    );
});
