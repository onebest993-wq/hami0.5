import React from 'react';
import { X } from '@/app/components/ui/icons/X';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { BTN_BASE, BTN_DISABLED } from '../personalCoerciveStyles';
import { PersonalCoerciveFollowUpPortal } from './PersonalCoerciveFollowUpPortal';
import type { PickPersonalCoerciveSectionProps } from '../sections/personalCoerciveSectionBag';

export function PersonalCoerciveConfirmPortals({
    releaseConfirmOpen,
    releaseConfirmBusy,
    setReleaseConfirmOpen,
    releaseReason,
    confirmReleaseDetention,
    forcedBringWithdrawConfirmOpen,
    forcedBringWithdrawBusy,
    setForcedBringWithdrawConfirmOpen,
    withdrawInvestigationCourtPath,
}: PickPersonalCoerciveSectionProps<
    | 'releaseConfirmOpen'
    | 'releaseConfirmBusy'
    | 'setReleaseConfirmOpen'
    | 'releaseReason'
    | 'confirmReleaseDetention'
    | 'forcedBringWithdrawConfirmOpen'
    | 'forcedBringWithdrawBusy'
    | 'setForcedBringWithdrawConfirmOpen'
    | 'withdrawInvestigationCourtPath'
>) {
    return (
        <>
            <PersonalCoerciveFollowUpPortal
                open={releaseConfirmOpen}
                dismissDisabled={releaseConfirmBusy}
                onDismiss={() => setReleaseConfirmOpen(false)}
            >
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3 pointer-events-auto"
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                                <p className="text-sm font-bold text-rose-100">تحذير</p>
                                <button
                                    type="button"
                                    aria-label="إغلاق"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                                    disabled={releaseConfirmBusy}
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <p className="text-[12px] leading-relaxed text-rose-100/95">
                                لا يمكن الرجوع عن إخلاء السبيل بعد التأكيد.
                            </p>
                            {releaseReason.trim() ? (
                                <p className="text-[10px] leading-relaxed text-slate-300 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
                                    سبب إخلاء السبيل: {releaseReason.trim()}
                                </p>
                            ) : null}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                    onClick={() => setReleaseConfirmOpen(false)}
                                >
                                    تراجع
                                </button>
                                <button
                                    type="button"
                                    disabled={releaseConfirmBusy}
                                    className="rounded-xl border border-rose-500/45 bg-rose-950/40 py-2.5 text-[11px] font-black text-rose-100 hover:bg-rose-950/55 disabled:opacity-50"
                                    onClick={() => confirmReleaseDetention(releaseReason)}
                                >
                                    تأكيد إخلاء السبيل
                                </button>
                            </div>
                        </div>
            </PersonalCoerciveFollowUpPortal>

            <PersonalCoerciveFollowUpPortal
                open={forcedBringWithdrawConfirmOpen}
                dismissDisabled={forcedBringWithdrawBusy}
                onDismiss={() => setForcedBringWithdrawConfirmOpen(false)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className="w-full max-w-sm rounded-2xl border border-amber-500/30 bg-[#0A0F1C] p-4 shadow-2xl text-right space-y-3 pointer-events-auto"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-2 flex-row-reverse border-b border-white/10 pb-2">
                        <p className="text-sm font-bold text-amber-100">تنازل عن مفاتحة التحقيق</p>
                        <button
                            type="button"
                            aria-label="إغلاق"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-40"
                            disabled={forcedBringWithdrawBusy}
                            onClick={() => setForcedBringWithdrawConfirmOpen(false)}
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-[12px] leading-relaxed text-amber-100/95">
                        سيتم سحب طلب مفاتحة محكمة التحقيق (إن وُجد) وإخفاء بطاقتها، وإعادة تفعيل تسجيل نتيجة الإحضار
                        الجبري. لن تظهر بطاقة المفاتحة مجدداً إلا بعد تسجيل «المدين متخفي» من جديد.
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                            type="button"
                            disabled={forcedBringWithdrawBusy}
                            className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            onClick={() => setForcedBringWithdrawConfirmOpen(false)}
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={forcedBringWithdrawBusy}
                            className="rounded-xl border border-amber-500/45 bg-amber-950/40 py-2.5 text-[11px] font-black text-amber-100 hover:bg-amber-950/55 disabled:opacity-50"
                            onClick={() => withdrawInvestigationCourtPath()}
                        >
                            تأكيد التنازل
                        </button>
                    </div>
                </div>
            </PersonalCoerciveFollowUpPortal>
        </>
    );
}

export function PersonalCoerciveOptionalRemainingEntry({
    showOptionalRemainingProceduresEntry,
    coerciveUiLocked,
    isHistoricalMode,
    setOptionalRemainingProceduresOpen,
}: PickPersonalCoerciveSectionProps<
    | 'showOptionalRemainingProceduresEntry'
    | 'coerciveUiLocked'
    | 'setOptionalRemainingProceduresOpen'
> & { isHistoricalMode?: boolean }) {
    if (!showOptionalRemainingProceduresEntry) return null;
    return (
                <div className="relative pt-1">
                    <button
                        type="button"
                        disabled={coerciveUiLocked || isHistoricalMode}
                        onClick={() => setOptionalRemainingProceduresOpen(true)}
                        className={`w-full ${BTN_BASE} bg-gradient-to-l from-violet-500/10 to-transparent hover:from-violet-500/16 ${coerciveUiLocked || isHistoricalMode ? BTN_DISABLED : ''}`}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                <ChevronDown className="h-6 w-6 text-violet-200/80" />
                            </span>
                            <div className="min-w-0 flex-1 text-right">
                                <p className="text-sm font-bold text-violet-100">
                                    إظهار الإجراءات المتبقية
                                </p>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                    خطوة اختيارية: منع سفر أو طلب عرض الإضبارة على قاضي البداءة
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
    );
}
