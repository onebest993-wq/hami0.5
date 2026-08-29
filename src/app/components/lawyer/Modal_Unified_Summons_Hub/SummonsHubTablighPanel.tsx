import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { Bell } from '@/app/components/ui/icons/Bell';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Newspaper } from '@/app/components/ui/icons/Newspaper';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { PauseCircle } from '@/app/components/ui/icons/PauseCircle';
import { SummonsInlineDateField } from '@/app/components/lawyer/execution/SummonsInlineDateField';
import {
    HUB_GOLD_ACTION_CLASS,
    HUB_SECTION_CARD_CLASS,
} from './summonsHubStyles';

export interface SummonsHubTablighPanelProps {
    memoArchivedResolved: boolean;
    notificationCount: number;
    memoNoticeDateYmd: string;
    memoDateEditing: boolean;
    memoWindow: { expiryDateYmd: string; isExpired: boolean; daysRemaining: number } | null;
    memoError: string;
    summonsTodayYmdMax: string;
    showLawyerFeesIncludeCheckbox: boolean;
    initialNoticeLawyerFeesIncluded: boolean;
    setInitialNoticeLawyerFeesIncluded: (v: boolean) => void;
    suppressPublicationNotice: boolean;
    onRegisterDebtorVoluntaryAttendance?: () => boolean | void;
    evictionDebtorExecutionStrip?: {
        onRegisterAttendance?: () => void;
    };
    resolvedTablighTask: { noticeDateYmd: string; purpose: string } | null;
    debtorDate: string;
    setDebtorDate: (v: string) => void;
    dateError: string;
    noticeKindGoal: string;
    setNoticeKindGoal: (v: string) => void;
    setMemoDateEditing: (v: boolean) => void;
    setMemoError: (v: string) => void;
    setHubMainTab: (v: 'tabligh' | 'taklif' | 'nashr' | 'guarantor') => void;
    setDateError: (v: string) => void;
    setNashrFormError: (v: string) => void;
    setConfirmAttendanceWithoutNoticeOpen: (v: boolean) => void;
    setTablighTaskOptimistic: (v: { noticeDateYmd: string; purpose: string } | null) => void;
    setTablighClearedOptimistic: (v: boolean) => void;
    markExecutionSummonsArchived: (kind: 'attended' | 'expired') => void;
    submitExecutionSummonsDate: (nextYmd: string) => void;
    onTerminateTablighTask?: () => void;
    onDebtorNotification: (
        date: string,
        purpose: string,
        isHolidayExtension?: boolean,
        evictionSubsequentMeta?: unknown,
        initialNoticeLawyerFeesIncluded?: boolean,
        notifyOpts?: { forceExecutionMemo?: boolean },
    ) => void;
    onClose: () => void;
    validateDate: (inputDate: string) => { ok: boolean; error?: string };
}

export const SummonsHubTablighPanel: React.FC<SummonsHubTablighPanelProps> = ({
    memoArchivedResolved,
    notificationCount,
    memoNoticeDateYmd,
    memoDateEditing,
    memoWindow,
    memoError,
    summonsTodayYmdMax,
    showLawyerFeesIncludeCheckbox,
    initialNoticeLawyerFeesIncluded,
    setInitialNoticeLawyerFeesIncluded,
    suppressPublicationNotice,
    onRegisterDebtorVoluntaryAttendance,
    evictionDebtorExecutionStrip,
    resolvedTablighTask,
    debtorDate,
    setDebtorDate,
    dateError,
    noticeKindGoal,
    setNoticeKindGoal,
    setMemoDateEditing,
    setMemoError,
    setHubMainTab,
    setDateError,
    setNashrFormError,
    setConfirmAttendanceWithoutNoticeOpen,
    setTablighTaskOptimistic,
    setTablighClearedOptimistic,
    markExecutionSummonsArchived,
    submitExecutionSummonsDate,
    onTerminateTablighTask,
    onDebtorNotification,
    onClose,
    validateDate,
}) => (
    <motion.div
        key="debtor"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        {!memoArchivedResolved && notificationCount <= 1 ? (
            <div className={HUB_SECTION_CARD_CLASS} dir="rtl">
                {memoArchivedResolved ? (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/15 px-3 py-3">
                        <div className="flex flex-row-reverse items-center justify-between gap-2">
                            <span className="text-[12px] font-black text-emerald-200">مؤرشفة</span>
                            {memoNoticeDateYmd ? (
                                <span className="text-[11px] font-mono text-slate-200">
                                    {memoNoticeDateYmd}
                                </span>
                            ) : null}
                        </div>
                    </div>
                ) : memoNoticeDateYmd && !memoDateEditing ? (
                    <div className="space-y-3">
                        <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                            <div className="flex flex-row-reverse items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-[10px] font-semibold text-slate-400">
                                        تاريخ التبليغ
                                    </div>
                                    <div className="mt-0.5 text-[12px] font-mono font-bold text-white">
                                        {memoNoticeDateYmd}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMemoDateEditing(true)}
                                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.06]"
                                    aria-label="تعديل التاريخ"
                                    title="تعديل التاريخ"
                                >
                                    <Pencil size={16} />
                                </button>
                            </div>
                            {memoWindow ? (
                                <div className="mt-2 flex flex-row-reverse items-center justify-between gap-2">
                                    <span className="text-[10px] text-slate-400">تنتهي</span>
                                    <span className="text-[10px] font-mono text-slate-200">
                                        {memoWindow.expiryDateYmd}
                                    </span>
                                    <span
                                        className={`ml-auto rounded-lg border px-2 py-0.5 text-[10px] font-bold ${
                                            memoWindow.isExpired
                                                ? 'border-amber-500/30 bg-amber-950/25 text-amber-200'
                                                : 'border-[#E6C673]/20 bg-[#E6C673]/10 text-[#E6C673]'
                                        }`}
                                    >
                                        {memoWindow.isExpired
                                            ? 'منتهية'
                                            : `باقي ${memoWindow.daysRemaining} يوم`}
                                    </span>
                                </div>
                            ) : null}
                        </div>

                        {memoError ? (
                            <div className="text-right text-[11px] font-bold text-rose-300">
                                {memoError}
                            </div>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => markExecutionSummonsArchived('attended')}
                            className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/45 to-emerald-800/40 py-3 text-[12px] font-black text-emerald-50 hover:from-emerald-800/55 hover:to-emerald-700/55"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <CheckCircle size={18} className="text-emerald-200" />
                                حضر المدين
                            </span>
                        </button>

                        {memoWindow?.isExpired ? (
                            <button
                                type="button"
                                onClick={() => markExecutionSummonsArchived('expired')}
                                className="w-full rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/55 to-orange-950/40 py-3 text-[12px] font-black text-amber-50 hover:from-amber-900/60 hover:to-orange-900/55"
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <Calendar size={18} className="text-amber-200" />
                                    انتهاء مدة الإخبار
                                </span>
                            </button>
                        ) : null}
                    </div>
                ) : memoDateEditing ? (
                    <div className="space-y-3">
                        <SummonsInlineDateField
                            id="execution-memo-notice-date-edit"
                            label="تعديل تاريخ التبليغ بمذكرة الإخبار"
                            value={memoNoticeDateYmd}
                            max={summonsTodayYmdMax}
                            error={memoError}
                            accent="gold"
                            onChange={(next) => {
                                if (!next) return;
                                submitExecutionSummonsDate(next);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setMemoDateEditing(false);
                                setMemoError('');
                            }}
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-[11px] font-bold text-slate-300 hover:bg-white/[0.06]"
                        >
                            إلغاء التعديل
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {showLawyerFeesIncludeCheckbox ? (
                            <label className="flex cursor-pointer flex-row-reverse items-center justify-between gap-3 rounded-xl border border-sky-500/25 bg-sky-950/15 px-3 py-2">
                                <span className="text-[11px] font-bold text-sky-100/90">
                                    شمول أتعاب المحاماة
                                </span>
                                <input
                                    type="checkbox"
                                    checked={initialNoticeLawyerFeesIncluded}
                                    onChange={(e) => setInitialNoticeLawyerFeesIncluded(e.target.checked)}
                                    className="h-5 w-5 cursor-pointer rounded border-sky-500/40 bg-slate-900/50 checked:bg-sky-500"
                                />
                            </label>
                        ) : null}
                        <SummonsInlineDateField
                            id="execution-memo-notice-date"
                            label="تاريخ التبليغ بمذكرة الإخبار"
                            value={memoNoticeDateYmd}
                            max={summonsTodayYmdMax}
                            error={memoError}
                            accent="gold"
                            onChange={(next) => {
                                if (!next) return;
                                submitExecutionSummonsDate(next);
                            }}
                        />
                        {!suppressPublicationNotice ? (
                        <button
                            type="button"
                            onClick={() => {
                                setHubMainTab('nashr');
                                setDateError('');
                                setNashrFormError('');
                            }}
                            className={HUB_GOLD_ACTION_CLASS}
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <Newspaper size={18} className="text-[#E6C673]" />
                                التبليغ بالمذكرة بواسطة النشر
                            </span>
                        </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => setConfirmAttendanceWithoutNoticeOpen(true)}
                            disabled={!onRegisterDebtorVoluntaryAttendance && !evictionDebtorExecutionStrip?.onRegisterAttendance}
                            className="w-full rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-900/45 to-emerald-800/40 py-3 text-[12px] font-black text-emerald-50 hover:from-emerald-800/55 hover:to-emerald-700/55 disabled:cursor-not-allowed disabled:border-emerald-500/15 disabled:bg-emerald-950/10 disabled:text-emerald-50/60 disabled:shadow-none disabled:hover:from-emerald-900/45 disabled:hover:to-emerald-800/40"
                        >
                            <span className="flex flex-row-reverse items-center justify-center gap-2">
                                <CheckCircle
                                    size={18}
                                    className={
                                        onRegisterDebtorVoluntaryAttendance ||
                                        evictionDebtorExecutionStrip?.onRegisterAttendance
                                            ? 'text-emerald-200'
                                            : 'text-emerald-200/60'
                                    }
                                />
                                حضور المدين دون تبليغ
                            </span>
                        </button>
                    </div>
                )}
            </div>
        ) : (
            <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#06131A]/60 via-slate-950/45 to-cyan-950/20 p-4 shadow-lg shadow-black/30 backdrop-blur-sm" dir="rtl">
                {!memoArchivedResolved ? (
                    <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-3">
                        <div className="text-[12px] font-black text-slate-200">غير متاح حالياً</div>
                        <div className="mt-1 text-[10px] text-slate-500">
                            أكمل دورة مذكرة الإخبار أولاً.
                        </div>
                    </div>
                ) : (
                    resolvedTablighTask ? (
                        <div className="space-y-3">
                            <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/15 p-3 text-right">
                                <p className="text-cyan-100 text-xs font-black">تبليغ مسجّل</p>
                                <p className="mt-1 text-[11px] text-slate-200">
                                    تاريخ التبليغ:{' '}
                                    <span className="font-mono tabular-nums">
                                        {resolvedTablighTask.noticeDateYmd}
                                    </span>
                                </p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                    الغاية: {resolvedTablighTask.purpose.trim() || 'تبليغ'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onRegisterDebtorVoluntaryAttendance?.();
                                    setTablighTaskOptimistic(null);
                                    onClose();
                                }}
                                className="w-full rounded-xl border border-emerald-500/25 bg-emerald-900/20 py-3 text-[12px] font-black text-emerald-100 hover:bg-emerald-900/30"
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <CheckCircle size={18} className="text-emerald-200" />
                                    حضور المدين
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onTerminateTablighTask?.();
                                    setTablighTaskOptimistic(null);
                                    setTablighClearedOptimistic(true);
                                }}
                                className="w-full rounded-xl border border-amber-500/25 bg-amber-900/15 py-3 text-[12px] font-black text-amber-100 hover:bg-amber-900/25"
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <PauseCircle size={18} className="text-amber-200" />
                                    إنهاء التبليغ
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <SummonsInlineDateField
                                id="execution-subsequent-tabligh-date"
                                label="تاريخ التبليغ"
                                value={debtorDate}
                                max={summonsTodayYmdMax}
                                error={dateError}
                                accent="cyan"
                                onChange={setDebtorDate}
                            />
                            <div>
                                <label className="mb-1 block text-right text-[10px] font-bold text-slate-400">
                                    الغاية (اختياري)
                                </label>
                                <textarea
                                    value={noticeKindGoal}
                                    onChange={(e) => setNoticeKindGoal(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-white/10 bg-slate-900/35 px-4 py-2.5 text-right text-sm text-white"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    const ymd = String(debtorDate || '').trim();
                                    if (!ymd) {
                                        setDateError('أدخل تاريخ التبليغ');
                                        return;
                                    }
                                    const vr = validateDate(ymd);
                                    if (!vr.ok) {
                                        setDateError(vr.error || 'تأكد من تاريخ التبليغ');
                                        return;
                                    }
                                    setDateError('');
                                    const purpose = String(noticeKindGoal || '').trim();
                                    onDebtorNotification(
                                        ymd,
                                        purpose,
                                        false,
                                        undefined,
                                        undefined,
                                        {}
                                    );
                                    setTablighTaskOptimistic({
                                        noticeDateYmd: ymd,
                                        purpose: purpose || 'تبليغ',
                                    });
                                    setDebtorDate('');
                                    setNoticeKindGoal('');
                                    setDateError('');
                                }}
                                disabled={!debtorDate}
                                className={`w-full rounded-xl border border-cyan-500/30 bg-cyan-950/35 py-3 text-[12px] font-black text-cyan-50 transition-all ${
                                    debtorDate
                                        ? 'hover:bg-cyan-900/45 hover:border-cyan-400/35'
                                        : 'opacity-50 cursor-not-allowed'
                                }`}
                            >
                                <span className="flex flex-row-reverse items-center justify-center gap-2">
                                    <Bell size={18} className="text-cyan-200" />
                                    تسجيل تبليغ عادي
                                </span>
                            </button>
                        </div>
                    )
                )}
            </div>
        )}
    </motion.div>
);
