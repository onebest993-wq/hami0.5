import React from 'react';
import { CreditCard, ChevronDown, ChevronUp, History, HeartHandshake } from '@/app/components/ui/lucideIcons';
import { formatIqdDisplay } from '../utils';

export interface FocFundsCardHeaderProps {
    embeddedInFinancialHub: boolean;
    isExpanded: boolean;
    isRepresentingDebtor: boolean;
    onToggle: () => void;
    onKeyToggle: (e: React.KeyboardEvent) => void;
    collapsedHeaderClassName: string;
    expandedHeaderClassName: string;
    hideEvictionTotalsInChrome: boolean;
    totalOwedUnified: number;
    remainingUnified: number;
    trustBalanceUnified: number;
    onShowSeizureLog?: () => void;
    onShowLedger?: () => void;
    openDebtEditModal: () => void;
    debtEditLockReason: string | null;
    showOngoingAlimonyMonthlySection: boolean;
    onOpenAlimonyDetail: () => void;
}

/** بطاقة إدارة الأموال والمصاريف — الحالة المطوية + الموسّعة + شريط المضمّن داخل المركز المالي الموحّد */
export const FocFundsCardHeader: React.FC<FocFundsCardHeaderProps> = ({
    embeddedInFinancialHub,
    isExpanded,
    isRepresentingDebtor,
    onToggle,
    onKeyToggle,
    collapsedHeaderClassName,
    expandedHeaderClassName,
    hideEvictionTotalsInChrome,
    totalOwedUnified,
    remainingUnified,
    trustBalanceUnified,
    onShowSeizureLog,
    onShowLedger,
    openDebtEditModal,
    debtEditLockReason,
    showOngoingAlimonyMonthlySection,
    onOpenAlimonyDetail,
}) => {
    return (
        <>
            {!embeddedInFinancialHub && !isExpanded && (
                <div className="flex w-full items-stretch gap-0">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onToggle}
                        onKeyDown={onKeyToggle}
                        className={`${collapsedHeaderClassName} flex min-w-0 flex-1 cursor-pointer items-stretch outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40`}
                    >
                        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 sm:gap-3 sm:px-3">
                            <div className="flex min-w-0 items-center gap-1.5 text-right">
                                <CreditCard size={16} className="shrink-0 text-[#E6C673]/90" />
                                <h3 className="truncate text-sm font-bold leading-tight text-[#E6C673] sm:text-[15px]">
                                    إدارة الأموال والمصاريف
                                </h3>
                            </div>
                            {hideEvictionTotalsInChrome ? (
                                <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-medium text-slate-400">
                                    تخلية
                                </span>
                            ) : (
                                <div className="shrink-0 grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-[#E6C673]/20 bg-gradient-to-br from-white/[0.08] to-transparent px-2.5 py-1.5 text-right shadow-inner shadow-black/20 sm:px-3 sm:py-2">
                                        <p className="text-[8px] font-medium uppercase tracking-wider text-[#E6C673]/85">إجمالي الدين</p>
                                        <p className="text-[12px] font-black tabular-nums text-white sm:text-[13px]">
                                            {formatIqdDisplay(totalOwedUnified)}
                                        </p>
                                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">
                                            متبقي {formatIqdDisplay(remainingUnified)}
                                        </p>
                                        {onShowSeizureLog ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    onShowSeizureLog();
                                                }}
                                                className="mt-1 inline-flex items-center justify-center rounded-full border border-[#E6C673]/35 bg-[#E6C673]/10 p-1 text-[#E6C673] transition hover:bg-[#E6C673]/20"
                                                title="سجل الحجوزات"
                                                aria-label="سجل الحجوزات"
                                            >
                                                <History size={14} />
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/10 to-transparent px-2.5 py-1.5 text-right shadow-inner shadow-black/20 sm:px-3 sm:py-2">
                                        <p className="text-[8px] font-medium uppercase tracking-wider text-emerald-200/90">الأمانات</p>
                                        <p className="text-[12px] font-black tabular-nums text-white sm:text-[13px]">
                                            {formatIqdDisplay(trustBalanceUnified)}
                                        </p>
                                        <p className="mt-0.5 text-[9px] font-semibold text-slate-400">رصيد الصرف</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {onShowLedger && (
                        <button
                            type="button"
                            onClick={onShowLedger}
                            className="flex shrink-0 items-center border-s border-white/10 px-2 text-[#E6C673] transition hover:bg-[#E6C673]/15 sm:px-2.5"
                            title="السجل المالي العام — أرشيف البنود والمبالغ"
                            aria-label="فتح السجل المالي العام"
                        >
                            <History size={18} strokeWidth={1.75} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggle}
                        onKeyDown={onKeyToggle}
                        aria-expanded={false}
                        aria-label="توسيع إدارة الأموال والمصاريف"
                        className="flex h-full min-h-[3.25rem] shrink-0 items-center border-s border-white/10 px-2 sm:px-2.5 text-[#E6C673]/85 transition hover:bg-white/[0.06]"
                    >
                        <ChevronDown size={18} />
                    </button>
                </div>
            )}

            {!embeddedInFinancialHub && isExpanded && (
                <div className="flex w-full items-stretch gap-0">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onToggle}
                        onKeyDown={onKeyToggle}
                        className={`${expandedHeaderClassName} min-w-0 flex-1 cursor-pointer text-right outline-none focus-visible:ring-2 focus-visible:ring-[#E6C673]/40`}
                    >
                        <div className="space-y-2.5 px-2.5 py-2.5 sm:px-3 sm:py-3">
                            <div className="flex items-center justify-end gap-2">
                                <CreditCard size={16} className="shrink-0 text-[#E6C673]/90" />
                                <h3 className="truncate text-sm font-bold text-[#E6C673] sm:text-base">
                                    إدارة الأموال والمصاريف
                                </h3>
                            </div>
                            {hideEvictionTotalsInChrome ? (
                                <span className="inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">
                                    مسار التخلية — التفاصيل أدناه
                                </span>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-xl border border-white/10 bg-gradient-to-l from-white/[0.07] to-transparent px-3 py-2.5 text-right">
                                        <p className="mb-1 text-[10px] font-medium text-slate-400">إجمالي الدين</p>
                                        <p className="text-lg font-black leading-tight text-white tabular-nums sm:text-xl">
                                            {formatIqdDisplay(totalOwedUnified)}{' '}
                                            <span className="text-xs font-semibold text-slate-400">د.ع</span>
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-500/15 bg-gradient-to-l from-emerald-500/10 to-transparent px-3 py-2.5 text-right">
                                        <p className="mb-1 text-[10px] font-medium text-slate-400">الأمانات</p>
                                        <p className="text-lg font-black leading-tight text-white tabular-nums sm:text-xl">
                                            {formatIqdDisplay(trustBalanceUnified)}{' '}
                                            <span className="text-xs font-semibold text-slate-400">د.ع</span>
                                        </p>
                                        <p className="mt-1 text-[10px] font-semibold text-slate-400">رصيد الصرف</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {onShowLedger && (
                        <button
                            type="button"
                            onClick={onShowLedger}
                            className="flex shrink-0 items-center self-stretch border-s border-white/10 px-2.5 text-[#E6C673] transition hover:bg-[#E6C673]/15 sm:px-3"
                            title="السجل المالي العام"
                            aria-label="فتح السجل المالي العام"
                        >
                            <History size={18} strokeWidth={1.75} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onToggle}
                        onKeyDown={onKeyToggle}
                        aria-expanded
                        aria-label="طي إدارة الأموال والمصاريف"
                        className="flex shrink-0 items-center self-stretch border-s border-white/10 px-2.5 sm:px-3 text-[#E6C673]/85 transition hover:bg-white/[0.06]"
                    >
                        <ChevronUp size={18} />
                    </button>
                </div>
            )}

            {embeddedInFinancialHub && !isRepresentingDebtor && (
                <div className="space-y-2 pb-2">
                    {!hideEvictionTotalsInChrome ? (
                        <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                                <div className="flex flex-row-reverse items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="mb-0.5 text-[10px] font-medium text-slate-400">إجمالي الدين</p>
                                        <p className="text-base font-black leading-tight text-white tabular-nums">
                                            {formatIqdDisplay(totalOwedUnified)}{' '}
                                            <span className="text-[10px] font-semibold text-slate-400">د.ع</span>
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openDebtEditModal}
                                        disabled={Boolean(debtEditLockReason)}
                                        className="shrink-0 inline-flex items-center gap-1 rounded-md border border-[#E6C673]/30 bg-[#E6C673]/10 px-2 py-1 text-[9px] font-bold text-[#F5E6A8] transition hover:bg-[#E6C673]/15 disabled:opacity-35"
                                    >
                                        تعديل
                                    </button>
                                </div>
                            </div>
                            <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-right">
                                <p className="mb-0.5 text-[10px] font-medium text-slate-400">الأمانات</p>
                                <p className="text-base font-black leading-tight text-white tabular-nums">
                                    {formatIqdDisplay(trustBalanceUnified)}{' '}
                                    <span className="text-[10px] font-semibold text-slate-400">د.ع</span>
                                </p>
                                <p className="mt-0.5 text-[9px] font-semibold text-slate-500">رصيد الصرف</p>
                            </div>
                        </div>
                    ) : null}

                    {onShowLedger || showOngoingAlimonyMonthlySection ? (
                        <div className="flex flex-row-reverse items-center justify-end gap-2">
                            {onShowLedger ? (
                                <button
                                    type="button"
                                    onClick={onShowLedger}
                                    className="inline-flex flex-row-reverse items-center gap-1.5 rounded-lg border border-[#E6C673]/35 bg-[#E6C673]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#E6C673] transition hover:bg-[#E6C673]/20"
                                    title="السجل المالي العام — أرشيف البنود والمبالغ"
                                    aria-label="فتح السجل المالي العام"
                                >
                                    <History size={14} strokeWidth={1.75} />
                                    السجل المالي العام
                                </button>
                            ) : null}
                            {showOngoingAlimonyMonthlySection ? (
                                <button
                                    type="button"
                                    onClick={onOpenAlimonyDetail}
                                    className="inline-flex items-center justify-center rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/8 p-1.5 text-[#E6C673] transition hover:bg-[#E6C673]/15 hover:border-[#E6C673]/45"
                                    title="استحقاق النفقة الشهري"
                                    aria-label="عرض استحقاق النفقة"
                                >
                                    <HeartHandshake size={14} strokeWidth={2} />
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            )}
        </>
    );
};
