import React, { useEffect, useState } from 'react';
import type { Decision } from '../types';
import {
    appealWindowsForDecision,
    buildManualExecutorAppealFilePatch,
    buildManualExecutorAppealLostPatch,
    buildManualExecutorAppealWonPatch,
    buildManualExecutorCassationFilePatch,
    buildManualExecutorGrievanceOutcomePatch,
    decisionAppealClockYmd,
    formatAppealClockYmdLabel,
    resolveCassationAppealClockYmd,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
    shouldShowAppealDeadlineLapseActions,
    todayYmd,
} from '../utils';
import { ManualExecutorAppealClockField } from './ManualExecutorAppealClockField';

export type ManualExecutorSmartCardPanelProps = {
    decision: Decision;
    btnPrimaryWFull: string;
    patchDecisionRow: (decisionId: string, patch: Partial<Decision>) => void;
    logAppealTimeline: (title: string, description?: string) => void;
    goToAppealsWithScroll: (decisionId: string) => void;
    onOpenArchiveTab: () => void;
};

export function ManualExecutorSmartCardPanel({
    decision,
    btnPrimaryWFull,
    patchDecisionRow,
    logAppealTimeline,
    goToAppealsWithScroll,
    onOpenArchiveTab,
}: ManualExecutorSmartCardPanelProps) {
    const flag = resolveExecutorDecisionStatusFlag(decision);
    const workflowPhase = resolveManualExecutorWorkflowPhase(decision);
    const windows = appealWindowsForDecision(decision);
    const [showAppealForm, setShowAppealForm] = useState(false);
    const [appellant, setAppellant] = useState<'lawyer' | 'debtor'>(
        decision.manualExecutorAppealAppellant ?? 'lawyer'
    );
    const [appealKind, setAppealKind] = useState<'tadhallum' | 'tamyeez'>('tadhallum');
    const [grievanceOutcomeDateYmd, setGrievanceOutcomeDateYmd] = useState(() =>
        String(
            decision.grievanceOutcomeIssuedYmd ||
                decision.cassationAppealClockYmd ||
                todayYmd()
        ).slice(0, 10)
    );
    const originalDecisionYmd = decisionAppealClockYmd(decision);

    useEffect(() => {
        if (decision.manualExecutorAppealAppellant) {
            setAppellant(decision.manualExecutorAppealAppellant);
        }
    }, [decision.manualExecutorAppealAppellant, decision.id]);

    useEffect(() => {
        if (workflowPhase === 'cassation_unlocked') {
            setShowAppealForm(true);
            setAppealKind('tamyeez');
        }
    }, [workflowPhase, decision.id]);

    useEffect(() => {
        if (!windows.canTadhallum && appealKind === 'tadhallum') {
            setAppealKind('tamyeez');
        }
    }, [windows.canTadhallum, appealKind]);

    if (flag === 3) return null;

    if (shouldShowAppealDeadlineLapseActions(decision)) {
        return null;
    }

    const submitInitialAppeal = () => {
        const patch = buildManualExecutorAppealFilePatch(decision, appellant, appealKind);
        patchDecisionRow(decision.id, patch);
        logAppealTimeline(
            appealKind === 'tadhallum' ? 'تسجيل تظلم' : 'تسجيل تمييز',
            patch.appealTimelineLogs?.[0]?.message
        );
        setShowAppealForm(false);
        queueMicrotask(() => goToAppealsWithScroll(decision.id));
    };

    const submitGrievanceOutcome = (accepted: boolean) => {
        if (!grievanceOutcomeDateYmd.trim()) return;
        const patch = buildManualExecutorGrievanceOutcomePatch(
            decision,
            accepted,
            grievanceOutcomeDateYmd
        );
        patchDecisionRow(decision.id, patch);
        logAppealTimeline(
            'نتيجة التظلم',
            patch.appealTimelineLogs?.[0]?.message
        );
    };

    const submitCassation = () => {
        const patch = buildManualExecutorCassationFilePatch(decision);
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('تسجيل تمييز', patch.appealTimelineLogs?.[0]?.message);
        setShowAppealForm(false);
    };

    const resolveWon = () => {
        const patch = buildManualExecutorAppealWonPatch(decision);
        if (!patch.executorDecisionStatusFlag) return;
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('حسم التمييز — كسبنا', patch.appealTimelineLogs?.[0]?.message);
        if (patch.executorDecisionStatusFlag === 3 || patch.isArchived) {
            queueMicrotask(() => onOpenArchiveTab());
        }
    };

    const resolveLost = () => {
        const patch = buildManualExecutorAppealLostPatch(decision);
        if (!patch.executorDecisionStatusFlag) return;
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('حسم التمييز — خسرنا', patch.appealTimelineLogs?.[0]?.message);
        if (patch.executorDecisionStatusFlag === 3 || patch.isArchived) {
            queueMicrotask(() => onOpenArchiveTab());
        }
    };

    const cassationOnlyLocked = workflowPhase === 'cassation_unlocked';
    const grievanceLocked = workflowPhase === 'grievance_pending' || cassationOnlyLocked;

    if (workflowPhase === 'grievance_pending' && !windows.isPastGrievanceDeadline) {
        return (
            <div className="min-h-0 flex w-full min-w-0 flex-col gap-2">
                <p className="text-[10px] leading-relaxed text-amber-200/90">
                    سجّل نتيجة قرار المنفذ في التظلم المعلّق:
                </p>
                <ManualExecutorAppealClockField
                    id={`grievance-outcome-date-${decision.id}`}
                    label="تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)"
                    valueYmd={grievanceOutcomeDateYmd}
                    onChangeYmd={setGrievanceOutcomeDateYmd}
                    hint={`القرار الأصلي صدر بتاريخ ${formatAppealClockYmdLabel(originalDecisionYmd)} — تُحسب مهلة التمييز من اليوم التالي لتاريخ قرار التظلم أعلاه.`}
                />
                <button
                    type="button"
                    onClick={() => submitGrievanceOutcome(true)}
                    className={btnPrimaryWFull}
                >
                    قُبل التظلم (تعديل/إلغاء القرار الأصلي)
                </button>
                <button
                    type="button"
                    onClick={() => submitGrievanceOutcome(false)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 px-3 text-center text-[11px] font-bold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08]"
                >
                    رُدّ التظلم (تأييد القرار الأصلي)
                </button>
            </div>
        );
    }

    if (workflowPhase === 'cassation_unlocked' && windows.canTamyeez) {
        const cassationClockYmd = resolveCassationAppealClockYmd(decision);
        return (
            <div className="min-h-0 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[10px] leading-relaxed text-amber-200/90">
                    انتهى التظلم — الممر الوحيد المتبقي هو التمييز خلال مهلة 7 أيام.
                </p>
                <ManualExecutorAppealClockField
                    id={`cassation-clock-${decision.id}`}
                    label="تاريخ إصدار القرار (معيار احتساب مهلة التمييز)"
                    valueYmd={cassationClockYmd}
                    readOnly
                    hint={`القرار الأصلي: ${formatAppealClockYmdLabel(originalDecisionYmd)} — مهلة التمييز من اليوم التالي للتاريخ المعروض.`}
                />
                <div className="space-y-1.5">
                    <label
                        htmlFor={`appeal-kind-cassation-${decision.id}`}
                        className="text-[10px] font-bold text-slate-400"
                    >
                        نوع الطعن القانوني
                    </label>
                    <select
                        id={`appeal-kind-cassation-${decision.id}`}
                        value="tamyeez"
                        disabled
                        className="w-full cursor-not-allowed rounded-xl border border-[#E6C673]/30 bg-[#E6C673]/10 px-3 py-2 text-[11px] text-[#E6C673] outline-none"
                    >
                        <option value="tamyeez">طعن تمييزي أمام محكمة الاستئناف</option>
                    </select>
                </div>
                <button type="button" onClick={submitCassation} className={btnPrimaryWFull}>
                    تسجيل التمييز
                </button>
            </div>
        );
    }

    if (workflowPhase === 'cassation_pending' && windows.canTamyeez) {
        return (
            <div className="flex w-full min-w-0 flex-col gap-2">
                <button type="button" onClick={resolveWon} className={btnPrimaryWFull}>
                    كسبنا الطعن (نقض القرار)
                </button>
                <button
                    type="button"
                    onClick={resolveLost}
                    className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 py-2 px-3 text-center text-[11px] font-bold text-rose-200 backdrop-blur-md transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/15"
                >
                    خسرنا الطعن (تصديق القرار)
                </button>
            </div>
        );
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-2">
            {!showAppealForm ? (
                <button
                    type="button"
                    onClick={() => setShowAppealForm(true)}
                    className={btnPrimaryWFull}
                >
                    تسجيل الطعن
                </button>
            ) : (
                <div className="min-h-0 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="space-y-2">
                        <p className="text-[10px] font-bold text-slate-400">مَن هو الطاعن؟</p>
                        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-200">
                            <input
                                type="radio"
                                name={`appellant-${decision.id}`}
                                checked={appellant === 'lawyer'}
                                onChange={() => setAppellant('lawyer')}
                                className="accent-[#E6C673]"
                            />
                            الدائن
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-200">
                            <input
                                type="radio"
                                name={`appellant-${decision.id}`}
                                checked={appellant === 'debtor'}
                                onChange={() => setAppellant('debtor')}
                                className="accent-[#E6C673]"
                            />
                            المدين
                        </label>
                    </div>
                    <div className="space-y-1.5">
                        <label
                            htmlFor={`appeal-kind-${decision.id}`}
                            className="text-[10px] font-bold text-slate-400"
                        >
                            نوع الطعن القانوني
                        </label>
                        <select
                            id={`appeal-kind-${decision.id}`}
                            value={appealKind}
                            onChange={(e) =>
                                setAppealKind(e.target.value as 'tadhallum' | 'tamyeez')
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white outline-none focus:border-[#E6C673]/40"
                        >
                            {windows.canTadhallum && !grievanceLocked ? (
                                <option value="tadhallum">تظلم أمام المنفذ العدل</option>
                            ) : null}
                            <option value="tamyeez">طعن تمييزي أمام محكمة الاستئناف</option>
                        </select>
                    </div>
                    <div className="flex flex-row-reverse gap-2">
                        <button type="button" onClick={submitInitialAppeal} className={btnPrimaryWFull}>
                            حفظ
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowAppealForm(false)}
                            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-slate-300"
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
