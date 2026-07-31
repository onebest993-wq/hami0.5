import React from 'react';
import { X } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';
import { archiveExecutiveDetentionCycleDecisions } from '@/app/utils/executorSeizureDecisionQueue';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { PersonalCoerciveFollowUpPortal } from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveFollowupModalsProps {
    releaseConfirmOpen: boolean;
    releaseConfirmBusy: boolean;
    setReleaseConfirmOpen: (open: boolean) => void;
    setReleaseConfirmBusy: (busy: boolean) => void;
    buildReleaseDetentionPatch: () => Record<string, unknown>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (e: TimelineEvent) => void;
    nextTimelineId: () => string;
    debtorTimelineMeta: TimelineEvent['metadata'];
    exId: string;
    activeDebtorKey: string;
    primaryDebtorKey: string;
    setDetentionRejectionOpen: (open: boolean) => void;
    setDetentionRejectionReason: (reason: string) => void;
    goBackToPersonalCoerciveHub: () => void;
    setLocalDecisionsTick: (updater: (n: number) => number) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    forcedBringWithdrawConfirmOpen: boolean;
    forcedBringWithdrawBusy: boolean;
    setForcedBringWithdrawConfirmOpen: (open: boolean) => void;
    withdrawInvestigationCourtPath: () => void;
}

/** الشيتات المنبثقة المشتركة لمحضر المتابعة — إخلاء السبيل والتنازل عن مفاتحة التحقيق */
export function PersonalCoerciveFollowupModals({
    releaseConfirmOpen,
    releaseConfirmBusy,
    setReleaseConfirmOpen,
    setReleaseConfirmBusy,
    buildReleaseDetentionPatch,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    debtorTimelineMeta,
    exId,
    activeDebtorKey,
    primaryDebtorKey,
    setDetentionRejectionOpen,
    setDetentionRejectionReason,
    goBackToPersonalCoerciveHub,
    setLocalDecisionsTick,
    showToast,
    forcedBringWithdrawConfirmOpen,
    forcedBringWithdrawBusy,
    setForcedBringWithdrawConfirmOpen,
    withdrawInvestigationCourtPath,
}: PersonalCoerciveFollowupModalsProps) {
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
                        تحذير: يُنهى مسار الحبس التنفيذي وعرض الإضبارة الحالي فقط. الإحضار الجبري ومنع السفر
                        والمفاتحة يبقون كما هي. لا يمكن الرجوع عن إخلاء السبيل.
                    </p>
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
                            onClick={() => {
                                if (releaseConfirmBusy) return;
                                setReleaseConfirmBusy(true);
                                setReleaseConfirmOpen(false);
                                const nowIso = new Date().toISOString();
                                const releasePatch = buildReleaseDetentionPatch();
                                persistExecutionMerge(releasePatch);
                                pushTimelineEvent({
                                    id: nextTimelineId(),
                                    date: getLocalTodayYmd(),
                                    timestamp: nowIso,
                                    title: 'تم إخلاء سبيل المدين — انتهاء مسار الحبس التنفيذي',
                                    description:
                                        'أُنهيت دورة الحبس وعرض الإضبارة فقط؛ باقي الإجراءات الجبرية (إحضار، منع سفر، مفاتحة) لم تُمس.',
                                    type: 'coercive',
                                    source: 'محضر المتابعة',
                                    metadata: debtorTimelineMeta,
                                });
                                archiveExecutiveDetentionCycleDecisions({
                                    executionId: exId,
                                    debtorKey: activeDebtorKey,
                                    primaryDebtorKey,
                                });
                                setDetentionRejectionOpen(false);
                                setDetentionRejectionReason('');
                                goBackToPersonalCoerciveHub();
                                setLocalDecisionsTick((n) => n + 1);
                                showToast(
                                    'تم إخلاء السبيل — يمكنك تقديم طلب عرض إضبارة جديد عند الحاجة.',
                                    'success'
                                );
                                setReleaseConfirmBusy(false);
                            }}
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
