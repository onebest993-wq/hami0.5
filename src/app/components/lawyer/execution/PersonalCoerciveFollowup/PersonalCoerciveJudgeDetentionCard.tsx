import React from 'react';
import { UserX, ChevronDown } from 'lucide-react';
import type { PersonalCoerciveAppealSyncView } from '@/app/utils/personalCoerciveAppealSync';
import {
    COERCIVE_SECTION_DETAILS_CLASS,
    CoerciveSubsectionFold,
} from '@/app/components/lawyer/execution/PersonalCoerciveFollowup/personalCoercivePresentation';

export interface PersonalCoerciveJudgeDetentionCardProps {
    show: boolean;
    judgeDetailsOpen: boolean;
    setJudgeDetailsOpen: (open: boolean) => void;
    dossierHandedToJudgeStalled: boolean;
    renderAppealSyncFollowup: (sync: PersonalCoerciveAppealSyncView) => React.ReactNode;
    dossierSync: PersonalCoerciveAppealSyncView;
    detentionActive: boolean;
    dossierAwaitingJudge: boolean;
    coerciveWriteLocked: boolean;
    recordExecutiveDetentionJudgeOutcome: (
        outcome: 'approved' | 'rejected',
        now: string,
        rejectionReason?: string
    ) => void;
    setDetentionRejectionOpen: (open: boolean) => void;
    detentionRejectionOpen: boolean;
    detentionRejectionReason: string;
    setDetentionRejectionReason: (reason: string) => void;
    detentionRejectionSaving: boolean;
    setDetentionRejectionSaving: (saving: boolean) => void;
    showToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    judgeDetention: 'approved' | 'rejected' | null;
    judgeDetentionStored: 'approved' | 'rejected' | null;
    dossierPhase: 'handed_to_judge' | 'judge_decided' | 'detention_active' | null | undefined;
    dossierShowStartPeriod: boolean;
    inAbsentia: boolean;
    startDetentionFourMonths: (opts?: { markCustody?: boolean; markArrested?: boolean }) => void;
    judgeSync: PersonalCoerciveAppealSyncView;
    judgeRejectedResubmitVisible: boolean;
    renderJudgeRejectedResubmitBlock: () => React.ReactNode;
}

/** بطاقة قرار القاضي والحبس التنفيذي — مستقلة عن مسار المنفذ */
export function PersonalCoerciveJudgeDetentionCard({
    show,
    judgeDetailsOpen,
    setJudgeDetailsOpen,
    dossierHandedToJudgeStalled,
    renderAppealSyncFollowup,
    dossierSync,
    detentionActive,
    dossierAwaitingJudge,
    coerciveWriteLocked,
    recordExecutiveDetentionJudgeOutcome,
    setDetentionRejectionOpen,
    detentionRejectionOpen,
    detentionRejectionReason,
    setDetentionRejectionReason,
    detentionRejectionSaving,
    setDetentionRejectionSaving,
    showToast,
    judgeDetention,
    judgeDetentionStored,
    dossierPhase,
    dossierShowStartPeriod,
    inAbsentia,
    startDetentionFourMonths,
    judgeSync,
    judgeRejectedResubmitVisible,
    renderJudgeRejectedResubmitBlock,
}: PersonalCoerciveJudgeDetentionCardProps) {
    if (!show) return null;
    return (
        <details
            open={judgeDetailsOpen}
            onToggle={(e) => setJudgeDetailsOpen((e.target as HTMLDetailsElement).open)}
            className={`${COERCIVE_SECTION_DETAILS_CLASS} open:border-orange-400/40`}
        >
            <summary className="flex cursor-pointer list-none flex-row-reverse items-center justify-between gap-2 px-3 py-3 transition-colors duration-300 hover:bg-white/[0.04] [&::-webkit-details-marker]:hidden">
                <span className="flex flex-row-reverse items-center gap-2">
                    <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5">
                        <UserX className="size-6 text-white/70" />
                    </span>
                    <span className="text-xs font-bold text-orange-100">قرار القاضي — الحبس التنفيذي</span>
                </span>
                <ChevronDown
                    size={18}
                    className="shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180"
                    aria-hidden
                />
            </summary>
            <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                {dossierHandedToJudgeStalled ? renderAppealSyncFollowup(dossierSync) : null}
                {!detentionActive && dossierAwaitingJudge ? (
                    <div className="space-y-2">
                        <p className="text-[11px] font-black text-violet-200">بانتظار قرار قاضي البداءة</p>
                        <p className="text-[10px] leading-relaxed text-violet-200/80">
                            انتهى دور المنفذ — سجّل موافقة أو رفض القاضي. يُنشأ قرار مستقل في مركز القرارات.
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                type="button"
                                disabled={coerciveWriteLocked}
                                className="w-full rounded-xl bg-emerald-800/55 py-2 text-[11px] font-bold text-white border border-emerald-500/35 disabled:opacity-40"
                                onClick={() => {
                                    if (coerciveWriteLocked) return;
                                    recordExecutiveDetentionJudgeOutcome('approved', new Date().toISOString());
                                }}
                            >
                                وافق القاضي على الحبس
                            </button>
                            <button
                                type="button"
                                disabled={coerciveWriteLocked}
                                className="w-full rounded-xl border border-rose-500/45 bg-rose-950/35 py-2 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                onClick={() => {
                                    if (coerciveWriteLocked) return;
                                    setDetentionRejectionOpen(true);
                                }}
                            >
                                رفض القاضي حبس المدين
                            </button>
                        </div>
                        {detentionRejectionOpen ? (
                            <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/15 p-3">
                                <p className="text-[10px] font-bold text-rose-200">يرجى ذكر سبب الرفض</p>
                                <textarea
                                    value={detentionRejectionReason}
                                    onChange={(e) => setDetentionRejectionReason(e.target.value)}
                                    rows={3}
                                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        disabled={detentionRejectionSaving || coerciveWriteLocked}
                                        className="rounded-xl border border-rose-500/40 bg-rose-900/30 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            const reason = detentionRejectionReason.trim();
                                            if (!reason) {
                                                showToast('سبب الرفض مطلوب.', 'warning');
                                                return;
                                            }
                                            if (detentionRejectionSaving) return;
                                            setDetentionRejectionSaving(true);
                                            recordExecutiveDetentionJudgeOutcome(
                                                'rejected',
                                                new Date().toISOString(),
                                                reason
                                            );
                                            setDetentionRejectionSaving(false);
                                            setDetentionRejectionOpen(false);
                                            setDetentionRejectionReason('');
                                        }}
                                    >
                                        حفظ السبب والانتقال للطعن
                                    </button>
                                    <button
                                        type="button"
                                        disabled={detentionRejectionSaving}
                                        className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                        onClick={() => {
                                            setDetentionRejectionOpen(false);
                                            setDetentionRejectionReason('');
                                        }}
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ) : null}
                {!detentionActive &&
                judgeDetention === 'approved' &&
                judgeDetentionStored === 'rejected' &&
                dossierPhase === 'judge_decided' ? (
                    <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-[10px] leading-relaxed text-emerald-100/90">
                        تم نقض رفض القاضي تمييزياً — أصبح الحبس التنفيذي موافقاً عليه. يمكنك بدء المدة أدناه.
                    </p>
                ) : null}
                {!detentionActive && dossierShowStartPeriod ? (
                    <CoerciveSubsectionFold title="بدء مدة الحبس التنفيذي" titleClassName="text-emerald-200">
                        <p className="text-[10px] text-emerald-200/90">
                            وافق القاضي — تُحتسب المدة تلقائياً لمدة 4 أشهر.
                        </p>
                        {inAbsentia ? (
                            <button
                                type="button"
                                disabled={coerciveWriteLocked}
                                className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                                onClick={() => {
                                    if (coerciveWriteLocked) return;
                                    startDetentionFourMonths({ markCustody: true, markArrested: true });
                                }}
                            >
                                تم إلقاء القبض على المدين — بدء المدة
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={coerciveWriteLocked}
                                className="w-full rounded-xl bg-orange-800/55 py-2 text-[11px] font-bold text-white disabled:opacity-40"
                                onClick={() => {
                                    if (coerciveWriteLocked) return;
                                    startDetentionFourMonths({ markCustody: true });
                                }}
                            >
                                بدء المدة (4 أشهر)
                            </button>
                        )}
                    </CoerciveSubsectionFold>
                ) : null}
                {judgeSync.followupBlock ? renderAppealSyncFollowup(judgeSync) : null}
                {!detentionActive && !dossierAwaitingJudge && !judgeSync.followupBlock && judgeRejectedResubmitVisible
                    ? renderJudgeRejectedResubmitBlock()
                    : null}
            </div>
        </details>
    );
}
