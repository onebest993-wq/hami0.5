import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Newspaper } from '@/app/components/ui/icons/Newspaper';
import {
    daysRemainingUntilDeadline,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import { publicationNoticeDeadlineYmd } from '@/app/utils/publicationNoticeDebtor';
import type { PublicationNoticeDebtorState } from '@/app/types/execution';
import { SummonsInlineDateField } from '@/app/components/lawyer/execution/SummonsInlineDateField';
import {
    HUB_GOLD_ACTION_CLASS,
    HUB_SELECT_CLASS,
} from './summonsHubStyles';

export interface SummonsHubNashrPanelProps {
    publicationNoticeFeature?: {
        state: PublicationNoticeDebtorState | null;
        onRegister: (p: {
            publicationDateYmd: string;
            newspaper1: string;
            newspaper2: string;
        }) => void;
        onTerminate: () => void;
        onDebtorAttended: () => void;
    };
    nashrLockReason: string | null;
    resolvedPublicationNotice: PublicationNoticeDebtorState | null;
    nashrDate: string;
    setNashrDate: (v: string) => void;
    nashrPaper1: string;
    setNashrPaper1: (v: string) => void;
    nashrPaper2: string;
    setNashrPaper2: (v: string) => void;
    nashrFormError: string;
    setNashrFormError: (v: string) => void;
    hubMainTab: 'tabligh' | 'taklif' | 'nashr' | 'guarantor';
    dateError: string;
    setDateError: (v: string) => void;
    summonsTodayYmdMax: string;
    memoArchivedResolved: boolean;
    notificationCount: number;
    setMemoDateOptimistic: (v: string) => void;
    setNashrClearedOptimistic: (v: boolean) => void;
    setHubMainTab: (v: 'tabligh' | 'taklif' | 'nashr' | 'guarantor') => void;
    onDebtorNotification: (
        date: string,
        purpose: string,
        isHolidayExtension?: boolean,
        evictionSubsequentMeta?: unknown,
        initialNoticeLawyerFeesIncluded?: boolean,
        notifyOpts?: { forceExecutionMemo?: boolean },
    ) => void;
    validateDate: (inputDate: string) => { ok: boolean; error?: string };
}

export const SummonsHubNashrPanel: React.FC<SummonsHubNashrPanelProps> = ({
    publicationNoticeFeature,
    nashrLockReason,
    resolvedPublicationNotice,
    nashrDate,
    setNashrDate,
    nashrPaper1,
    setNashrPaper1,
    nashrPaper2,
    setNashrPaper2,
    nashrFormError,
    setNashrFormError,
    hubMainTab,
    dateError,
    setDateError,
    summonsTodayYmdMax,
    memoArchivedResolved,
    notificationCount,
    setMemoDateOptimistic,
    setNashrClearedOptimistic,
    setHubMainTab,
    onDebtorNotification,
    validateDate,
}) => (
    (publicationNoticeFeature ? (
    <motion.div
        key="nashr"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        {nashrLockReason ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
                <p className="text-sm text-slate-200">{nashrLockReason}</p>
            </div>
        ) : resolvedPublicationNotice ? (
            <>
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/25 p-3 text-right space-y-1.5">
                    <p className="text-cyan-100 text-xs font-bold">
                        تبليغ بالنشر سارٍ — تاريخ النشر:{' '}
                        <span className="font-mono tabular-nums">
                            {resolvedPublicationNotice.publicationDateYmd}
                        </span>
                    </p>
                    <p className="text-slate-300 text-[11px]">
                        الجريدة ١: {resolvedPublicationNotice.newspaper1}
                    </p>
                    <p className="text-slate-300 text-[11px]">
                        الجريدة ٢: {resolvedPublicationNotice.newspaper2}
                    </p>
                    <p className="text-slate-400 text-[10px]">
                        آخر يوم للمدة:{' '}
                        <span className="font-mono text-slate-200">
                            {publicationNoticeDeadlineYmd(
                                resolvedPublicationNotice.publicationDateYmd
                            )}
                        </span>
                    </p>
                    {(() => {
                        const dl = publicationNoticeDeadlineYmd(
                            resolvedPublicationNotice.publicationDateYmd
                        );
                        const passed = isAssignmentDeadlinePassed(dl);
                        const rem = daysRemainingUntilDeadline(dl);
                        return (
                            <p className="text-emerald-200/90 text-[11px] font-semibold">
                                {passed
                                    ? 'انتهت المدة التقويمية للتبليغ بالنشر.'
                                    : `متبقٍ تقويمياً: ${rem} يوماً`}
                            </p>
                        );
                    })()}
                </div>
                <button
                    type="button"
                    onClick={() => {
                        publicationNoticeFeature.onDebtorAttended();
                        setHubMainTab('nashr');
                        setNashrFormError('');
                    }}
                    className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    <CheckCircle size={18} />
                    حضور المدين
                </button>
                <button
                    type="button"
                    onClick={() => {
                        publicationNoticeFeature.onTerminate();
                        setNashrClearedOptimistic(true);
                        setHubMainTab('nashr');
                        setNashrFormError('');
                    }}
                    className="w-full border border-slate-500/50 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                >
                    إنهاء التبليغ بالنشر
                </button>
            </>
        ) : (
            <>
        <div>
            <SummonsInlineDateField
                id="execution-nashr-publication-date"
                label="تاريخ النشر في الجريدة"
                value={nashrDate}
                max={summonsTodayYmdMax}
                accent="gold"
                onChange={setNashrDate}
            />
        </div>
                <div>
                    <label
                        htmlFor="execution-nashr-newspaper-1"
                        className="block text-gray-300 text-sm font-semibold mb-2 text-right"
                    >
                        اسم الجريدة الأولى
                    </label>
                    <input
                        id="execution-nashr-newspaper-1"
                        type="text"
                        value={nashrPaper1}
                        onChange={(e) => setNashrPaper1(e.target.value)}
                        className={HUB_SELECT_CLASS}
                        placeholder=""
                        dir="rtl"
                    />
                </div>
                <div>
                    <label
                        htmlFor="execution-nashr-newspaper-2"
                        className="block text-gray-300 text-sm font-semibold mb-2 text-right"
                    >
                        اسم الجريدة الثانية
                    </label>
                    <input
                        id="execution-nashr-newspaper-2"
                        type="text"
                        value={nashrPaper2}
                        onChange={(e) => setNashrPaper2(e.target.value)}
                        className={HUB_SELECT_CLASS}
                        placeholder=""
                        dir="rtl"
                    />
                </div>
                {(nashrFormError || (hubMainTab === 'nashr' && dateError)) && (
                    <p className="text-red-400 text-xs text-right">
                        {nashrFormError || dateError}
                    </p>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setNashrFormError('');
                        const d = String(nashrDate ?? '').trim();
                        if (!d) {
                            setNashrFormError('أدخل تاريخ النشر في الجريدة');
                            return;
                        }
                        const vr = validateDate(d);
                        if (!vr.ok) {
                            setDateError(vr.error || 'تأكد من تاريخ النشر');
                            setNashrFormError(vr.error || 'تأكد من تاريخ النشر');
                            return;
                        }
                        setDateError('');
                        const p1 = nashrPaper1.trim();
                        const p2 = nashrPaper2.trim();
                        if (!p1 || !p2) {
                            setNashrFormError('أدخل اسم الجريدتين');
                            return;
                        }
                        if (!memoArchivedResolved && notificationCount === 0) {
                            // تسجيل مرساة مذكرة الإخبار عند اعتماد مسار النشر لأول مرة
                            onDebtorNotification(
                                d,
                                'مذكرة الإخبار بالتنفيذ بالنشر',
                                false,
                                undefined,
                                undefined,
                                {}
                            );
                            setMemoDateOptimistic(d);
                        }
                        publicationNoticeFeature.onRegister({
                            publicationDateYmd: d,
                            newspaper1: p1,
                            newspaper2: p2,
                        });
                        setNashrDate('');
                        setNashrPaper1('');
                        setNashrPaper2('');
                        setDateError('');
                    }}
                    className={`${HUB_GOLD_ACTION_CLASS} flex items-center justify-center gap-2`}
                >
                    <Newspaper size={18} />
                    تسجيل التبليغ بالنشر
                </button>
            </>
        )}
    </motion.div>
    ) : (
    <motion.div
        key="nashr"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
    >
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-right" dir="rtl">
            <p className="text-white text-sm font-bold">التبليغ بالنشر</p>
            <p className="mt-1 text-[11px] text-slate-400">غير متاح لهذه الإضبارة حالياً.</p>
        </div>
    </motion.div>
    ))
);
