import React, { useEffect, useState } from 'react';
import { CalendarDays, RotateCcw, X } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { ABANDONMENT_REVIEW_DAYS, resolveAbandonmentReviewDeadline } from '../../smartFile/caseFlowStatusDisplay';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export type NextHearingResumeModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { nextHearingDate: string }) => void;
    mode: 'interruption_resume' | 'abandonment_renewal' | 'pause_resume';
    interruptionReason?: string;
    interruptionParty?: string;
    abandonmentEventYmd?: string;
};

export function NextHearingResumeModal({
    isOpen,
    onClose,
    onConfirm,
    mode,
    interruptionReason,
    interruptionParty,
    abandonmentEventYmd,
}: NextHearingResumeModalProps) {
    const T = useSmartFileModalTheme();
    const [nextHearingDate, setNextHearingDate] = useState(getLocalTodayYmd());

    useEffect(() => {
        if (!isOpen) return;
        setNextHearingDate(getLocalTodayYmd());
    }, [isOpen]);

    if (!isOpen) return null;

    const isAbandonment = mode === 'abandonment_renewal';
    const isPause = mode === 'pause_resume';
    const title = isAbandonment
        ? 'فتح باب المراجعة'
        : isPause
          ? 'استئناف السير (رفع الاستئخار)'
          : 'استئناف السير في الدعوى';
    const confirmLabel = isAbandonment
        ? 'حفظ وفتح باب المرافعة'
        : isPause
          ? 'حفظ واستئناف السير'
          : 'تأكيد استئناف السير';
    const reviewDeadline = isAbandonment
        ? resolveAbandonmentReviewDeadline(abandonmentEventYmd ?? getLocalTodayYmd())
        : null;

    const reason = String(interruptionReason ?? '').trim();
    const party = String(interruptionParty ?? '').trim();

    const handleConfirm = () => {
        if (!nextHearingDate) return;
        if (typeof onConfirm !== 'function') {
            onClose();
            return;
        }
        onConfirm({ nextHearingDate });
        onClose();
    };

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-md">
            <div className={T.header}>
                <h3 className={T.headerTitle}>
                    <RotateCcw size={17} className={T.headerIcon} strokeWidth={1.75} />
                    {title}
                </h3>
                <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                    <X size={16} />
                </button>
            </div>

            <div className={`${T.body} space-y-4`}>
                {!isAbandonment && reason ? (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-right space-y-1">
                        <p className="text-[11px] text-white/45">سبب الانقطاع</p>
                        <p className="text-sm text-white/85 font-medium">{reason}</p>
                        {party ? (
                            <p className="text-xs text-white/55">
                                الطرف المعني: <span className="text-white/75">{party}</span>
                            </p>
                        ) : null}
                    </div>
                ) : null}

                {isAbandonment ? (
                    <p className="text-xs text-white/55 leading-relaxed text-right">
                        يجب تجديد الدعوى خلال {ABANDONMENT_REVIEW_DAYS} أيام من اليوم التالي لتركها للمراجعة.
                        {reviewDeadline ? (
                            <>
                                {' '}
                                آخر مهلة للتجديد:{' '}
                                <span className="text-[#E6C673]/90 font-bold tabular-nums">{reviewDeadline}</span>
                            </>
                        ) : null}
                    </p>
                ) : isPause ? (
                    <p className="text-xs text-white/55 leading-relaxed text-right">
                        سجّل موعد المرافعة القادمة بعد رفع استئخار الدعوى وفتح باب المرافعة.
                    </p>
                ) : (
                    <p className="text-xs text-white/55 leading-relaxed text-right">
                        سجّل موعد المرافعة القادمة بعد زوال سبب الانقطاع.
                    </p>
                )}

                <div>
                    <label className={T.label}>
                        <CalendarDays size={12} className={T.labelIcon} />
                        موعد المرافعة القادم <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={nextHearingDate}
                        onChange={(e) => setNextHearingDate(e.target.value)}
                        className={T.field}
                    />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                    <button type="button" onClick={onClose} className={T.btnNeutral}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={!nextHearingDate}
                        className={`${T.btn} ${T.btnDisabled}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </MoroccanGlassShell>
    );
}
