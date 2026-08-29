import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievanceOutcomeAndExpired(props: GrievanceLifecyclePanelProps) {
    const {
        caseData,
        grievanceData,
        grievanceExpiredCanClose,
        grievanceExpiredConfirmed,
        grievanceLegalEndDate,
        grievanceTimingConfirmed,
        grievanceWizardInputsLocked,
        isFinalized,
        persistGrievanceOutcomeDraft,
        setGrievanceDetailsConfirmed,
        setGrievanceExpiredConfirmed,
        setPhase2FirstHearingDate,
        showGrievanceOutcomeForm,
    } = props;

    return (
<>
                                                    {showGrievanceOutcomeForm ? (
                                                    <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
                                                        <div className="text-white font-extrabold text-sm">حالة التظلم</div>
                                                        <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                            <input
                                                                type="radio"
                                                                name="grievanceOutcome"
                                                                value="filed"
                                                                checked={grievanceData.outcome === 'filed'}
                                                                onChange={() => {
                                                                    setGrievanceExpiredConfirmed(false);
                                                                    setGrievanceDetailsConfirmed(false);
                                                                    const p1 =
                                                                        String(caseData?.firstHearingDate ?? '')
                                                                            .trim()
                                                                            .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                                                                    setPhase2FirstHearingDate((prev) => {
                                                                        const p2 =
                                                                            String(prev || '')
                                                                                .trim()
                                                                                .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
                                                                        if (p1 && p2 === p1) return '';
                                                                        return prev;
                                                                    });
                                                                    persistGrievanceOutcomeDraft('filed');
                                                                }}
                                                                disabled={grievanceWizardInputsLocked || !grievanceTimingConfirmed}
                                                                className="accent-orange-500"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-white font-bold">تم تقديم تظلم</p>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                            <input
                                                                type="radio"
                                                                name="grievanceOutcome"
                                                                value="expired"
                                                                checked={grievanceData.outcome === 'expired'}
                                                                onChange={() => {
                                                                    setGrievanceExpiredConfirmed(false);
                                                                    setGrievanceDetailsConfirmed(false);
                                                                    persistGrievanceOutcomeDraft('expired');
                                                                }}
                                                                disabled={grievanceWizardInputsLocked || !grievanceTimingConfirmed}
                                                                className="accent-slate-400"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-white font-bold">انقضت المدة دون تظلم</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    ) : null}

                                                    <AnimatePresence initial={false}>
                                                        {grievanceData.outcome === 'expired' && grievanceTimingConfirmed ? (
                                                            <motion.div
                                                                key="grievance-expired"
                                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
                                                                    <div
                                                                        className={`border rounded-xl px-4 py-3 ${
                                                                            grievanceExpiredCanClose
                                                                                ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-100'
                                                                                : 'border-amber-500/25 bg-amber-500/10 text-amber-100'
                                                                        } text-xs font-bold`}
                                                                    >
                                                                        {grievanceExpiredCanClose
                                                                            ? 'انقضت المدة القانونية. يمكن إغلاق مرحلة التظلم.'
                                                                            : 'لا يمكن تثبيت الانقضاء قبل انقضاء المدة القانونية.'}
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {!grievanceExpiredConfirmed ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!grievanceExpiredCanClose) return;
                                                                                    setGrievanceExpiredConfirmed(true);
                                                                                }}
                                                                                disabled={isFinalized || !grievanceExpiredCanClose}
                                                                                title={
                                                                                    !grievanceExpiredCanClose
                                                                                        ? 'لا يمكن تأكيد الانقضاء إلا بعد تجاوز التاريخ المحدد'
                                                                                        : undefined
                                                                                }
                                                                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                تأكيد انقضاء المدة
                                                                            </button>
                                                                        ) : (
                                                                            <div className="text-white/60 text-xs font-bold">
                                                                                يمكنك إغلاق الإضبارة من زر حفظ وإنهاء الإضبارة أسفل المرحلة
                                                                            </div>
                                                                        )}
                                                                        {!grievanceExpiredCanClose ? (
                                                                            <p className="text-white/50 text-xs max-w-md text-right">
                                                                                لا يمكن تأكيد الانقضاء إلا بعد تجاوز التاريخ المحدد
                                                                                {grievanceLegalEndDate
                                                                                    ? ` (${formatDateText(grievanceLegalEndDate)})`
                                                                                    : ''}
                                                                                .
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ) : null}
                                                    </AnimatePresence>
</>
    );
}
