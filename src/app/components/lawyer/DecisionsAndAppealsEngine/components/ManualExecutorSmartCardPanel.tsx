import React, { useEffect, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { Decision } from '../types';
import {
    appealWindowsForDecision,
    buildManualExecutorAppealFilePatch,
    buildManualExecutorCassationFilePatch,
    buildManualExecutorCassationNaqdPatch,
    buildManualExecutorCassationRadLaheezaPatch,
    buildManualExecutorGrievanceOutcomePatch,
    decisionAppealClockYmd,
    manualExecutorAwaitingCassationParty,
    manualExecutorCassationEntryButtonLabel,
    manualExecutorCassationFiledNoticeLabel,
    resolveExecutorDecisionStatusFlag,
    resolveManualExecutorWorkflowPhase,
    shouldShowAppealDeadlineLapseActions,
    todayYmd,
} from '../utils';
import { DECISION_BTN_DEBTOR_APPEAL_NOTICE } from '../decisionCardPresentation';
import { ManualExecutorAppealClockField } from './ManualExecutorAppealClockField';
import { AppealSelectedDeadlineHint } from './AppealSelectedDeadlineHint';

const CHIP_BASE =
    'min-h-[36px] rounded-full border px-3 py-1.5 text-[10px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-40';
const CHIP_OFF = 'border-white/10 bg-white/[0.04] text-slate-400 hover:text-slate-200';
const CHIP_ON =
    'border-[#E6C673]/35 bg-[#E6C673]/[0.12] text-[#E6C673] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

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
    const canSubmitInitialAppeal =
        appealKind === 'tadhallum' ? windows.canTadhallum : windows.canTamyeez;

    useEffect(() => {
        if (decision.manualExecutorAppealAppellant) {
            setAppellant(decision.manualExecutorAppealAppellant);
        }
    }, [decision.manualExecutorAppealAppellant, decision.id]);

    useEffect(() => {
        if (workflowPhase === 'cassation_unlocked') {
            setShowAppealForm(false);
        }
    }, [workflowPhase, decision.id]);

    useEffect(() => {
        if (!windows.canTadhallum && appealKind === 'tadhallum') {
            setAppealKind('tamyeez');
        }
    }, [windows.canTadhallum, appealKind]);

    if (flag === 3) return null;

    if (
        shouldShowAppealDeadlineLapseActions(decision) &&
        workflowPhase !== 'cassation_pending'
    ) {
        return null;
    }

    const submitInitialAppeal = () => {
        const patch = buildManualExecutorAppealFilePatch(decision, appellant, appealKind);
        if (!patch.executorDecisionStatusFlag) {
            SmartToast.error(
                appealKind === 'tadhallum'
                    ? 'انتهت مهلة التظلم — لا يمكن تسجيل الطعن بهذا النوع'
                    : 'انتهت مهلة التمييز — لا يمكن تسجيل الطعن بهذا النوع'
            );
            return;
        }
        patchDecisionRow(decision.id, patch);
        logAppealTimeline(
            appealKind === 'tadhallum' ? 'تسجيل تظلم' : 'تسجيل تمييز',
            patch.appealTimelineLogs?.[0]?.message
        );
        setShowAppealForm(false);
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
        const party = manualExecutorAwaitingCassationParty(decision);
        if (!party) return;
        const patch = buildManualExecutorCassationFilePatch(decision);
        if (!patch.manualExecutorAppealAppellant) return;
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('تسجيل تمييز', patch.appealTimelineLogs?.[0]?.message);
    };

    const submitCassationNaqd = () => {
        const patch = buildManualExecutorCassationNaqdPatch(decision);
        if (!patch.executorDecisionStatusFlag) return;
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('نتيجة التمييز', patch.appealTimelineLogs?.[0]?.message);
        if (patch.isArchived) {
            queueMicrotask(() => onOpenArchiveTab());
        }
    };

    const submitCassationRadLaheeza = () => {
        const patch = buildManualExecutorCassationRadLaheezaPatch(decision);
        if (!patch.executorDecisionStatusFlag) return;
        patchDecisionRow(decision.id, patch);
        logAppealTimeline('نتيجة التمييز', patch.appealTimelineLogs?.[0]?.message);
        if (patch.isArchived) {
            queueMicrotask(() => onOpenArchiveTab());
        }
    };

    if (workflowPhase === 'grievance_pending' && !windows.isPastGrievanceDeadline) {
        const grievanceFiler =
            decision.manualExecutorAppealAppellant === 'debtor' ? 'المدين' : 'الدائن';
        return (
            <div className="min-h-0 flex w-full min-w-0 flex-col gap-2">
                <p className="text-[10px] leading-relaxed text-amber-200/90">
                    مقدّم التظلم: {grievanceFiler} — سجّل نتيجة قرار المنفذ:
                </p>
                <ManualExecutorAppealClockField
                    id={`grievance-outcome-date-${decision.id}`}
                    label="تاريخ إصدار قرار التظلم (معيار بدء احتساب مهلة التمييز)"
                    valueYmd={grievanceOutcomeDateYmd}
                    onChangeYmd={setGrievanceOutcomeDateYmd}
                />
                <button
                    type="button"
                    onClick={() => submitGrievanceOutcome(true)}
                    className={btnPrimaryWFull}
                >
                    قبول التظلم
                </button>
                <button
                    type="button"
                    onClick={() => submitGrievanceOutcome(false)}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2 px-3 text-center text-[11px] font-bold text-slate-200 backdrop-blur-md transition-all duration-200 hover:border-white/18 hover:bg-white/[0.08]"
                >
                    رد التظلم
                </button>
            </div>
        );
    }

    if (workflowPhase === 'cassation_unlocked') {
        const cassationParty = manualExecutorAwaitingCassationParty(decision);
        if (!cassationParty) return null;
        if (!windows.canTamyeez) return null;
        return (
            <div className="min-h-0 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <AppealSelectedDeadlineHint
                    kind="tamyeez"
                    decisionYmd={originalDecisionYmd}
                    windows={windows}
                />
                <button type="button" onClick={submitCassation} className={btnPrimaryWFull}>
                    {manualExecutorCassationEntryButtonLabel(cassationParty)}
                </button>
            </div>
        );
    }

    if (workflowPhase === 'cassation_pending') {
        const cassationParty = decision.manualExecutorAppealAppellant;
        return (
            <div className="flex w-full min-w-0 flex-col gap-2">
                {cassationParty ? (
                    <span
                        className={`${DECISION_BTN_DEBTOR_APPEAL_NOTICE} pointer-events-none`}
                        aria-live="polite"
                    >
                        {manualExecutorCassationFiledNoticeLabel(cassationParty)}
                    </span>
                ) : null}
                <p className="text-[10px] leading-relaxed text-slate-400">نتيجة التمييز:</p>
                <button type="button" onClick={submitCassationNaqd} className={btnPrimaryWFull}>
                    نقض القرار
                </button>
                <button
                    type="button"
                    onClick={submitCassationRadLaheeza}
                    className="w-full rounded-xl border border-rose-500/25 bg-rose-500/10 py-2 px-3 text-center text-[11px] font-bold text-rose-200 backdrop-blur-md transition-all duration-200 hover:border-rose-500/40 hover:bg-rose-500/15"
                >
                    رد اللائحة
                </button>
            </div>
        );
    }

    if (flag === 2) {
        return null;
    }

    const appealWindowsOpen = windows.canTadhallum || windows.canTamyeez;
    if (!appealWindowsOpen) {
        return null;
    }

    return (
        <div className="flex w-full min-w-0 flex-col gap-2">
            {!showAppealForm ? (
                <button
                    type="button"
                    onClick={() => {
                        setAppealKind(windows.canTadhallum ? 'tadhallum' : 'tamyeez');
                        setShowAppealForm(true);
                    }}
                    className={btnPrimaryWFull}
                >
                    تسجيل الطعن
                </button>
            ) : (
                <div className="min-h-0 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400">نوع الطعن</p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                disabled={!windows.canTadhallum}
                                onClick={() => setAppealKind('tadhallum')}
                                className={`${CHIP_BASE} ${appealKind === 'tadhallum' ? CHIP_ON : CHIP_OFF}`}
                            >
                                تظلم أمام المنفذ
                            </button>
                            <button
                                type="button"
                                disabled={!windows.canTamyeez}
                                onClick={() => setAppealKind('tamyeez')}
                                className={`${CHIP_BASE} ${appealKind === 'tamyeez' ? CHIP_ON : CHIP_OFF}`}
                            >
                                تمييز أمام الاستئناف
                            </button>
                        </div>
                        <AppealSelectedDeadlineHint
                            kind={appealKind}
                            decisionYmd={originalDecisionYmd}
                            windows={windows}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400">مقدّم التظلم</p>
                        <div className="flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setAppellant('lawyer')}
                                className={`${CHIP_BASE} ${appellant === 'lawyer' ? CHIP_ON : CHIP_OFF}`}
                            >
                                الدائن
                            </button>
                            <button
                                type="button"
                                onClick={() => setAppellant('debtor')}
                                className={`${CHIP_BASE} ${appellant === 'debtor' ? CHIP_ON : CHIP_OFF}`}
                            >
                                المدين
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-row-reverse gap-2 pt-1">
                        <button
                            type="button"
                            onClick={submitInitialAppeal}
                            disabled={!canSubmitInitialAppeal}
                            className={`${btnPrimaryWFull}${!canSubmitInitialAppeal ? ' pointer-events-none opacity-40' : ''}`}
                        >
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
