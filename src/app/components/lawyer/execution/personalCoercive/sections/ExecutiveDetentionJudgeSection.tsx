import React from 'react';
import { BTN_BASE } from '../personalCoerciveStyles';
import { CoerciveSubsectionFold } from '../chrome/CoerciveSubsectionFold';
import { Unlock } from '@/app/components/ui/icons/Unlock';
import { UserX } from '@/app/components/ui/icons/UserX';
import type { PickPersonalCoerciveSectionProps } from './personalCoerciveSectionBag';

export type ExecutiveDetentionJudgeSectionProps = PickPersonalCoerciveSectionProps<
    | 'coerciveWriteLocked'
    | 'detentionActive'
    | 'detentionPeriodActivePanel'
    | 'detentionRejectionOpen'
    | 'detentionRejectionReason'
    | 'detentionRejectionSaving'
    | 'detentionUntil'
    | 'dossierAbsentiaPathOpen'
    | 'dossierAwaitingJudge'
    | 'dossierHandedToJudgeStalled'
    | 'dossierPhaseEffective'
    | 'dossierShowStartPeriod'
    | 'dossierSync'
    | 'executionData'
    | 'handleApproveExecutiveDetention'
    | 'judgeDetention'
    | 'judgeDetentionStored'
    | 'judgeRejectedResubmitVisible'
    | 'judgeSync'
    | 'recordExecutiveDetentionJudgeOutcome'
    | 'releaseConfirmBusy'
    | 'releaseReason'
    | 'releaseReasonOpen'
    | 'renderAppealSyncFollowup'
    | 'renderJudgeRejectedResubmitBlock'
    | 'setDetentionRejectionOpen'
    | 'setDetentionRejectionReason'
    | 'setDetentionRejectionSaving'
    | 'setReleaseConfirmOpen'
    | 'setReleaseReason'
    | 'setReleaseReasonOpen'
    | 'showEmbeddedSection'
    | 'showJudgeDetentionCard'
    | 'showToast'
    | 'startDetentionFourMonths'
>;


export function ExecutiveDetentionJudgeSection({
    coerciveWriteLocked,
    detentionActive,
    detentionPeriodActivePanel,
    detentionRejectionOpen,
    detentionRejectionReason,
    detentionRejectionSaving,
    detentionUntil,
    dossierAbsentiaPathOpen,
    dossierAwaitingJudge,
    dossierHandedToJudgeStalled,
    dossierPhaseEffective,
    dossierShowStartPeriod,
    dossierSync,
    executionData,
    handleApproveExecutiveDetention,
    judgeDetention,
    judgeDetentionStored,
    judgeRejectedResubmitVisible,
    judgeSync,
    recordExecutiveDetentionJudgeOutcome,
    releaseConfirmBusy,
    releaseReason,
    releaseReasonOpen,
    renderAppealSyncFollowup,
    renderJudgeRejectedResubmitBlock,
    setDetentionRejectionOpen,
    setDetentionRejectionReason,
    setDetentionRejectionSaving,
    setReleaseConfirmOpen,
    setReleaseReason,
    setReleaseReasonOpen,
    showEmbeddedSection,
    showJudgeDetentionCard,
    showToast,
    startDetentionFourMonths,
}: ExecutiveDetentionJudgeSectionProps) {
    return (
        <>
{/* 4ب — قرار قاضي البداءة (بطاقة مستقلة بعد موافقة المنفذ على عرض الإضبارة) */}
            {showEmbeddedSection('executive_detention_judge') && showJudgeDetentionCard ? (
                <div className="overflow-visible rounded-2xl border border-violet-500/25 bg-violet-950/15 text-right">
                    <div className="relative">
                        <div
                            className={`w-full ${BTN_BASE} bg-gradient-to-l from-orange-500/12 to-transparent`}
                        >
                            <div className="flex flex-row-reverse items-center gap-3">
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                                    <UserX className="h-6 w-6 text-white/70" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-orange-100">قرار قاضي البداءة</p>
                                    {detentionActive ? (
                                        <p className="text-[10px] text-emerald-200/80">الحبس التنفيذي — نشط</p>
                                    ) : dossierAwaitingJudge ? (
                                        <p className="text-[10px] text-violet-200/80">بانتظار قرار القاضي</p>
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
                            {dossierHandedToJudgeStalled ? renderAppealSyncFollowup(dossierSync) : null}

                            {!detentionActive && dossierAwaitingJudge ? (
                                <CoerciveSubsectionFold
                                    title="قرار قاضي البداءة — بعد عرض الإضبارة"
                                    titleClassName="text-amber-100"
                                    defaultOpen
                                >
                                    <p className="text-[10px] leading-relaxed text-violet-200/80">
                                        انتهى طلب عرض الإضبارة — سجّل قرار القاضي. يُنشأ قرار مستقل في مركز
                                        القرارات والطعون.
                                    </p>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-emerald-800/55 py-2.5 text-[11px] font-bold text-white border border-emerald-500/35 disabled:opacity-40"
                                        onClick={() => handleApproveExecutiveDetention()}
                                    >
                                        حبس المدين تنفيذاً
                                    </button>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked || detentionRejectionOpen}
                                        className="w-full rounded-xl border border-rose-500/45 bg-rose-950/35 py-2.5 text-[11px] font-bold text-rose-100 disabled:opacity-40"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (coerciveWriteLocked) return;
                                            setDetentionRejectionOpen(true);
                                        }}
                                    >
                                        رفض حبس المدين
                                    </button>
                                    {detentionRejectionOpen ? (
                                        <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/15 p-3">
                                            <p className="text-[10px] font-bold text-rose-200">سبب رفض الحبس</p>
                                            <textarea
                                                value={detentionRejectionReason}
                                                onChange={(e) => setDetentionRejectionReason(e.target.value)}
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                                placeholder="اذكر سبب رفض حبس المدين"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={detentionRejectionSaving || coerciveWriteLocked}
                                                    className="rounded-xl border border-rose-500/40 bg-rose-900/30 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (coerciveWriteLocked) return;
                                                        const reason = detentionRejectionReason.trim();
                                                        if (!reason) {
                                                            showToast('سبب الرفض مطلوب.', 'warning');
                                                            return;
                                                        }
                                                        if (detentionRejectionSaving) return;
                                                        setDetentionRejectionSaving(true);
                                                        const ok = recordExecutiveDetentionJudgeOutcome(
                                                            'rejected',
                                                            new Date().toISOString(),
                                                            reason
                                                        );
                                                        setDetentionRejectionSaving(false);
                                                        if (!ok) return;
                                                    }}
                                                >
                                                    تأكيد الرفض
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={detentionRejectionSaving}
                                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDetentionRejectionOpen(false);
                                                        setDetentionRejectionReason('');
                                                    }}
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </CoerciveSubsectionFold>
                            ) : null}

                            {!detentionActive &&
                            judgeDetention === 'approved' &&
                            judgeDetentionStored === 'rejected' &&
                            dossierPhaseEffective === 'judge_decided' ? (
                                <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/20 px-3 py-2.5 text-[10px] leading-relaxed text-emerald-100/90">
                                    تم نقض رفض القاضي تمييزياً — أصبح الحبس التنفيذي موافقاً عليه. يمكنك تسجيل
                                    الحبس تنفيذاً أدناه.
                                </p>
                            ) : null}

                            {!detentionActive && dossierShowStartPeriod ? (
                                <CoerciveSubsectionFold
                                    title="حبس المدين تنفيذاً"
                                    titleClassName="text-emerald-200"
                                    defaultOpen
                                >
                                    <p className="text-[10px] text-emerald-200/90">
                                        وافق القاضي — اضغط لتفعيل مدة الحبس التنفيذي (4 أشهر).
                                    </p>
                                    <button
                                        type="button"
                                        disabled={coerciveWriteLocked}
                                        className="w-full rounded-xl bg-orange-800/55 py-2.5 text-[11px] font-bold text-white disabled:opacity-40"
                                        onClick={() => {
                                            if (coerciveWriteLocked) return;
                                            startDetentionFourMonths({
                                                markCustody: true,
                                                markArrested: dossierAbsentiaPathOpen,
                                            });
                                        }}
                                    >
                                        حبس المدين تنفيذاً — بدء المدة
                                    </button>
                                </CoerciveSubsectionFold>
                            ) : null}

                            {detentionPeriodActivePanel ? (
                                <CoerciveSubsectionFold
                                    title="إخلاء سبيل المدين"
                                    titleClassName="text-emerald-200"
                                    defaultOpen
                                >
                                    {detentionUntil ? (
                                        <p className="text-[10px] leading-relaxed text-emerald-200/90">
                                            المدة سارية حتى{' '}
                                            <span className="font-bold text-emerald-100">{detentionUntil}</span>
                                            {executionData?.executive_detention_days_total
                                                ? ` (${executionData.executive_detention_days_total} يوم)`
                                                : ''}
                                        </p>
                                    ) : (
                                        <p className="text-[10px] leading-relaxed text-emerald-200/90">
                                            مدة الحبس التنفيذي مفعّلة.
                                        </p>
                                    )}
                                    {!releaseReasonOpen ? (
                                        <button
                                            type="button"
                                            disabled={coerciveWriteLocked}
                                            className="w-full flex items-center justify-center gap-2 flex-row-reverse rounded-xl border border-emerald-800 bg-emerald-900/20 py-2.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-800/30 transition-all disabled:opacity-40"
                                            onClick={() => {
                                                if (coerciveWriteLocked) return;
                                                setReleaseReasonOpen(true);
                                            }}
                                        >
                                            <Unlock size={16} />
                                            إخلاء سبيل المدين
                                        </button>
                                    ) : (
                                        <div className="space-y-2 rounded-2xl border border-emerald-500/25 bg-emerald-950/15 p-3">
                                            <p className="text-[10px] font-bold text-emerald-200">سبب إخلاء السبيل</p>
                                            <textarea
                                                value={releaseReason}
                                                onChange={(e) => setReleaseReason(e.target.value)}
                                                rows={3}
                                                className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-2 py-2 text-[11px] text-white"
                                                placeholder="اذكر سبب إخلاء سبيل المدين"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <button
                                                    type="button"
                                                    disabled={releaseConfirmBusy || coerciveWriteLocked}
                                                    className="rounded-xl border border-rose-500/45 bg-rose-950/40 py-2.5 text-[11px] font-black text-rose-100 disabled:opacity-50"
                                                    onClick={() => {
                                                        if (coerciveWriteLocked) return;
                                                        const reason = releaseReason.trim();
                                                        if (!reason) {
                                                            showToast('سبب إخلاء السبيل مطلوب.', 'warning');
                                                            return;
                                                        }
                                                        setReleaseConfirmOpen(true);
                                                    }}
                                                >
                                                    تأكيد إخلاء السبيل
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={releaseConfirmBusy}
                                                    className="rounded-xl bg-slate-800 py-2.5 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                                                    onClick={() => {
                                                        setReleaseReasonOpen(false);
                                                        setReleaseReason('');
                                                    }}
                                                >
                                                    إلغاء
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </CoerciveSubsectionFold>
                            ) : null}

                            {judgeSync.followupBlock ? renderAppealSyncFollowup(judgeSync) : null}
                            {!detentionActive &&
                            !dossierAwaitingJudge &&
                            !judgeSync.followupBlock &&
                            judgeRejectedResubmitVisible
                                ? renderJudgeRejectedResubmitBlock()
                                : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
