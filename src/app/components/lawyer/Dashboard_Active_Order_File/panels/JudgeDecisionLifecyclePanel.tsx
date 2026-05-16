import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, FileCheck, ChevronDown } from 'lucide-react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import {
    getPreDecisionHearingOutcome,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../utils/hearingRules';
import { PRE_DECISION_OUTCOME_NULLIFY } from '../constants/hearingOutcomes';
import { formatDateText } from '../utils/formatters';
import type { JudgeDecisionLifecyclePanelProps } from './JudgeDecisionLifecyclePanelProps';

export type { JudgeDecisionLifecyclePanelProps } from './JudgeDecisionLifecyclePanelProps';

export function JudgeDecisionLifecyclePanel(props: JudgeDecisionLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        addHearing,
        clearJudgeDecision,
        defenderPhase1ReadOnly,
        defenderStateOrderSummaryDate,
        editJudge,
        effectiveJudgeDecision,
        effectiveJudgeDecisionDate,
        fastForwardToGrievance,
        fileStatus,
        guaranteeDetails,
        guaranteeSubmitted,
        handleJudgeDecisionSubmit,
        hasIntervention,
        hasSessions,
        hearingDraft,
        hearingDraftAdjournReasonError,
        hearingDraftNextSessionDateError,
        hearingDraftSessionDateError,
        hearingsError,
        intakeFirstHearingDate,
        isAdjourned,
        isCaseTerminated,
        isDefendantClient,
        isFinalityTerminatedRequest,
        isFinalized,
        isIqrarContext,
        isStateOrder,
        judgeDecision,
        judgeDecisionDateChronologyError,
        judgeError,
        phase1ActiveDate,
        phase1JudgeDecisionMinYmd,
        phase1NewSessionMinYmd,
        phase1Sessions,
        preDecisionHearingsSorted,
        preDecisionTerminalKind,
        registerOpponentIntervention,
        setGuaranteeDetails,
        setGuaranteeSubmitted,
        setHearingDraft,
        setJudgeDecision,
        showGrievanceStep,
        showJudgeDecisionBlock,
        showJudgeDecisionFullForm,
        showJudgeDecisionTerminateOnly,
        showPreDecisionHearings,
        toggleLifecycleStep,
    } = props;

    const judgePhaseComplete = fileStatus !== 'pending' && !!effectiveJudgeDecision;

    return (
                                <div
                                    className={`border rounded-xl overflow-hidden ${
                                        fileStatus === 'pending'
                                            ? 'border-blue-500/30'
                                            : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                              ? 'border-green-500/30'
                                              : 'border-red-500/30'
                                    }`}
                                >
                                <button
                                    type="button"
                                    onClick={() => toggleLifecycleStep('judge')}
                                    className={`w-full px-4 py-4 flex items-center justify-between gap-3 text-right ${
                                        fileStatus === 'pending' ? 'bg-gradient-to-r from-blue-900/30 to-cyan-900/20 hover:from-blue-900/40 hover:to-cyan-900/30' : 'bg-gradient-to-r from-slate-900/50 to-slate-900/30'
                                    } group`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                                                fileStatus === 'pending'
                                                    ? 'border-blue-500/40 bg-blue-500/10'
                                                    : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                                      ? 'border-green-500/40 bg-green-500/10'
                                                      : 'border-red-500/40 bg-red-500/10'
                                            }`}
                                        >
                                            <span className="text-sm font-extrabold text-white">1</span>
                                        </div>
                                        <div>
                                            <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                <FileCheck size={18} className="text-blue-300" />
                                                قرار القاضي
                                            </div>
                                            <div className="text-white/50 text-xs mt-0.5">
                                                {isFinalityTerminatedRequest
                                                    ? '🚫 دعوى مبطلة/متروكة'
                                                    : fileStatus === 'pending'
                                                    ? 'الخطوة الوحيدة النشطة حالياً'
                                                    : isIqrarContext && judgeDecision.decision === 'accepted'
                                                      ? `مكتملة: تم إصدار حجة الإقرار — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                      : judgeDecision.decision === 'accepted'
                                                        ? `مكتملة: إجابة الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                        : judgeDecision.decision === 'partially_accepted'
                                                          ? `مكتملة: إجابة جزئية — ${formatDateText(judgeDecision.decisionDate) || '—'}`
                                                          : `مكتملة: رفض الطلب — ${formatDateText(judgeDecision.decisionDate) || '—'}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-white/60 text-xs">
                                        {isFinalityTerminatedRequest
                                            ? '🚫'
                                            : fileStatus === 'pending'
                                            ? 'مفتوحة'
                                            : judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted'
                                              ? '✅'
                                              : '❌'}
                                        {(judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && judgeDecision.requiresGuarantee && (
                                            <span className="text-[11px] bg-amber-500/15 border border-amber-500/25 text-amber-100 px-2 py-0.5 rounded-full">
                                                كفالة {guaranteeSubmitted ? 'مودعة' : 'مطلوبة'}
                                            </span>
                                        )}
                                        <ChevronDown
                                            size={18}
                                            className={`shrink-0 text-white/50 transition-transform duration-200 ${
                                                activeLifecycleStep === 'judge' ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {activeLifecycleStep === 'judge' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="px-4 py-5 bg-[#0B1021] border-t border-white/10"
                                        >
                                            {isFinalized && (
                                                <div className="mb-4 border border-amber-500/25 bg-amber-500/10 rounded-xl px-4 py-3 text-amber-100 text-sm space-y-1">
                                                    <div className="font-extrabold">ملخص مرحلة قرار القاضي (للاطلاع)</div>
                                                    <div>
                                                        القرار:{' '}
                                                        {effectiveJudgeDecision === 'accepted'
                                                            ? 'إجابة الطلب'
                                                            : effectiveJudgeDecision === 'partially_accepted'
                                                              ? 'إجابة جزئية'
                                                              : effectiveJudgeDecision === 'rejected'
                                                                ? 'رفض الطلب'
                                                                : '—'}
                                                    </div>
                                                    <div>التاريخ: {formatDateText(effectiveJudgeDecisionDate) || '—'}</div>
                                                    {(effectiveJudgeDecision === 'accepted' || effectiveJudgeDecision === 'partially_accepted') && (
                                                        <div>
                                                            الكفالة: {judgeDecision.requiresGuarantee ? (guaranteeSubmitted ? 'مودعة' : 'مطلوبة') : 'غير مطلوبة'}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {defenderPhase1ReadOnly && !isFinalized && (
                                                <div className="mb-4 border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-white/90 text-sm space-y-2">
                                                    <div className="font-extrabold text-white">ملخص المرحلة البدائية (أمر ولائي غيابي — للاطلاع)</div>
                                                    <div>
                                                        صدر الأمر غيابياً بتاريخ{' '}
                                                        {formatDateText(defenderStateOrderSummaryDate) ||
                                                            formatDateText(effectiveJudgeDecisionDate) ||
                                                            '—'}
                                                        .
                                                    </div>
                                                    <div className="text-white/70 text-xs">
                                                        مؤمن: التعديل على الجلسات وقرار المرحلة الأولى؛ تابع الإجراء من المرحلة النشطة التالية.
                                                    </div>
                                                </div>
                                            )}
                                            {judgePhaseComplete && !isFinalized && !defenderPhase1ReadOnly && (
                                                <div className="mb-4 border border-white/10 bg-black/20 rounded-xl px-4 py-3 text-white/80 text-xs font-bold space-y-2">
                                                    <div className="text-white font-extrabold text-sm">ملخص قرار القاضي</div>
                                                    <div>
                                                        القرار:{' '}
                                                        {effectiveJudgeDecision === 'accepted'
                                                            ? 'إجابة الطلب'
                                                            : effectiveJudgeDecision === 'partially_accepted'
                                                              ? 'إجابة جزئية'
                                                              : effectiveJudgeDecision === 'rejected'
                                                                ? 'رفض الطلب'
                                                                : '—'}
                                                    </div>
                                                    <div>التاريخ: {formatDateText(effectiveJudgeDecisionDate) || '—'}</div>
                                                    {showPreDecisionHearings && hasSessions ? (
                                                        <div>عدد جلسات ما قبل القرار: {preDecisionHearingsSorted.length}</div>
                                                    ) : null}
                                                </div>
                                            )}
                                            {(fileStatus === 'pending' || editJudge) && !(defenderPhase1ReadOnly && !isFinalized) && (
                                            <div className="space-y-6">
                                                {!!judgeError && <ValidationBanner text={judgeError} />}
                                                {!!hearingsError && <ValidationBanner text={hearingsError} />}
                                                {isDefendantClient &&
                                                    !isIqrarContext &&
                                                    fileStatus === 'pending' &&
                                                    judgeDecision.decision === null &&
                                                    !isFinalized &&
                                                    !defenderPhase1ReadOnly && (
                                                    <div className="border border-blue-500/25 bg-blue-500/10 rounded-xl px-4 py-3">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="text-white text-sm font-bold">
                                                                💡 بصفتك وكيل المطلوب ضده، هل القرار صادر مسبقاً وتريد الانتقال لمرحلة {showGrievanceStep ? 'التظلم' : 'الطعن التمييزي'} مباشرة؟
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={fastForwardToGrievance}
                                                                className="shrink-0 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all"
                                                            >
                                                                ⏩ تخطي إلى {showGrievanceStep ? 'التظلم' : 'التمييز'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-6">
                                                {showPreDecisionHearings && (
                                                <div className="border border-white/10 bg-white/5 rounded-xl p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                            <Calendar size={16} className="text-blue-200" />
                                                            سجل الجلسات
                                                        </div>
                                                        {!isFinalized && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setHearingDraft({
                                                                        open: true,
                                                                        stage: 'pre_decision',
                                                                        outcome: 'adjourn',
                                                                        sessionDate: '',
                                                                        notes: '',
                                                                        nextSessionDate: '',
                                                                        decisionDate: '',
                                                                    })
                                                                }
                                                                disabled={isCaseTerminated}
                                                                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                <Plus size={14} />
                                                                إضافة جلسة
                                                            </button>
                                                        )}
                                                    </div>
                                                    {showPreDecisionHearings ? (
                                                        <div className="mt-4 border border-blue-500/20 bg-black/20 rounded-lg p-3 space-y-2">
                                                            <div className="text-white/60 text-xs mb-1">تاريخ المرافعة الأول</div>
                                                            <div className="text-white font-bold">
                                                                {intakeFirstHearingDate ? formatDateText(intakeFirstHearingDate) : '—'}
                                                            </div>
                                                            {phase1Sessions.length > 0 &&
                                                            phase1ActiveDate &&
                                                            intakeFirstHearingDate &&
                                                            phase1ActiveDate !== intakeFirstHearingDate ? (
                                                                <div className="text-white/50 text-xs">
                                                                    الموعد المعتمد بعد التأجيلات:{' '}
                                                                    {formatDateText(phase1ActiveDate)}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    ) : null}
                                                    <div className="mt-4">
                                                        {isCaseTerminated && preDecisionTerminalKind === 'nullify' ? (
                                                            <div className="border border-rose-500/25 bg-rose-500/10 rounded-lg px-3 py-2 text-rose-100 text-xs font-bold">
                                                                تم إبطال الطلب. يرجى حفظ وإغلاق الإضبارة نهائياً من الأسفل.
                                                            </div>
                                                        ) : isCaseTerminated && preDecisionTerminalKind === 'close' ? (
                                                            <div className="border border-emerald-500/25 bg-emerald-500/10 rounded-lg px-3 py-2 text-emerald-100 text-xs font-bold">
                                                                تم ختام المرافعة. يرجى إدخال قرار القاضي في الأسفل.
                                                            </div>
                                                        ) : null}
                                                        {hasSessions && isAdjourned ? (
                                                            <div className="border border-amber-500/25 bg-amber-500/10 rounded-lg px-3 py-2 text-amber-100 text-xs font-bold">
                                                                ⚠️ لإدخال قرار القاضي، يجب إضافة جلسة جديدة واختيار (ختام المرافعة)
                                                            </div>
                                                        ) : null}
                                                    </div>

                                                    <div className="mt-4 space-y-2">
                                                        {preDecisionHearingsSorted.length === 0 ? (
                                                            <div className="text-white/50 text-sm">لا توجد جلسات مسجلة</div>
                                                        ) : (
                                                            preDecisionHearingsSorted.map((h) => {
                                                                const notes = String(h.notes || '');
                                                                const isTerminate = isPreDecisionNullifyNotes(notes);
                                                                const isClosing =
                                                                    isPreDecisionCloseNotes(notes) ||
                                                                    (!isTerminate && !String(h.nextSessionDate || '').trim());
                                                                return (
                                                                    <div key={h.id} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                                        <div className="flex flex-row-reverse items-start gap-3">
                                                                            <div
                                                                                className={`mt-1.5 w-2.5 h-2.5 rounded-full ${
                                                                                    isTerminate ? 'bg-rose-400' : isClosing ? 'bg-emerald-400' : 'bg-blue-400'
                                                                                }`}
                                                                            />
                                                                            <div className="flex-1">
                                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                    <div className="text-white font-bold text-sm">
                                                                                        جلسة: {formatDateText(h.sessionDate) || '—'}
                                                                                    </div>
                                                                                    {String(h.nextSessionDate || '').trim() ? (
                                                                                        <span className="text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-100 px-2 py-0.5 rounded-full">
                                                                                            تأجيل إلى: {formatDateText(h.nextSessionDate)}
                                                                                        </span>
                                                                                    ) : isTerminate ? (
                                                                                        <span className="text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-100 px-2 py-0.5 rounded-full">
                                                                                            إبطال الطلب
                                                                                        </span>
                                                                                    ) : isClosing ? (
                                                                                        <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 px-2 py-0.5 rounded-full">
                                                                                            ختام المرافعة
                                                                                        </span>
                                                                                    ) : null}
                                                                                </div>
                                                                                {notes ? <div className="text-white/70 text-sm mt-2">{notes}</div> : null}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                    {hearingDraft.open && hearingDraft.stage === 'pre_decision' && !isCaseTerminated && (
                                                        <div className="mt-3 border border-white/10 bg-black/20 rounded-xl p-4 space-y-3">
                                                            <div className="space-y-3">
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                    <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="radio"
                                                                            name="preDecisionHearingOutcome"
                                                                            value="adjourn"
                                                                            checked={hearingDraft.outcome === 'adjourn'}
                                                                            onChange={() =>
                                                                                setHearingDraft((s) => ({
                                                                                    ...s,
                                                                                    outcome: 'adjourn',
                                                                                    decisionDate: '',
                                                                                    notes: '',
                                                                                }))
                                                                            }
                                                                            disabled={isFinalized}
                                                                            className="accent-blue-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">تأجيل إلى موعد آخر</p>
                                                                        </div>
                                                                    </label>
                                                                    <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="radio"
                                                                            name="preDecisionHearingOutcome"
                                                                            value="close"
                                                                            checked={hearingDraft.outcome === 'close'}
                                                                            onChange={() =>
                                                                                setHearingDraft((s) => ({
                                                                                    ...s,
                                                                                    outcome: 'close',
                                                                                    nextSessionDate: '',
                                                                                    notes: '',
                                                                                }))
                                                                            }
                                                                            disabled={isFinalized}
                                                                            className="accent-emerald-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">ختام المرافعة (لفتح إدخال القرار)</p>
                                                                        </div>
                                                                    </label>
                                                                    <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="radio"
                                                                            name="preDecisionHearingOutcome"
                                                                            value="terminate"
                                                                            checked={hearingDraft.outcome === 'terminate'}
                                                                            onChange={() =>
                                                                                setHearingDraft((s) => ({
                                                                                    ...s,
                                                                                    outcome: 'terminate',
                                                                                    nextSessionDate: '',
                                                                                    decisionDate: '',
                                                                                    notes: '',
                                                                                }))
                                                                            }
                                                                            disabled={isFinalized}
                                                                            className="accent-rose-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">{PRE_DECISION_OUTCOME_NULLIFY}</p>
                                                                        </div>
                                                                    </label>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                <div>
                                                                    <label className="block text-white/70 text-sm mb-2">تاريخ الجلسة</label>
                                                                    <DatePickerField
                                                                        value={hearingDraft.sessionDate || ''}
                                                                        onValueChange={(v) => setHearingDraft((s) => ({ ...s, sessionDate: v }))}
                                                                        min={phase1NewSessionMinYmd || undefined}
                                                                        disabled={isFinalized}
                                                                        inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/40 focus:outline-none"
                                                                    />
                                                                </div>
                                                                {hearingDraft.outcome === 'adjourn' ? (
                                                                    <div className="md:col-span-2">
                                                                        <label className="block text-white/70 text-sm mb-2">سبب التأجيل</label>
                                                                        <input
                                                                            type="text"
                                                                            value={hearingDraft.notes}
                                                                            onChange={(e) => setHearingDraft((s) => ({ ...s, notes: e.target.value }))}
                                                                            disabled={isFinalized}
                                                                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/40 focus:outline-none"
                                                                        />
                                                                        {!!hearingDraftAdjournReasonError && (
                                                                            <div className="mt-1 text-red-200 text-xs font-bold">{hearingDraftAdjournReasonError}</div>
                                                                        )}
                                                                    </div>
                                                                ) : null}
                                                            </div>

                                                            {hearingDraft.outcome === 'adjourn' ? (
                                                                <div>
                                                                    <label className="block text-white/70 text-sm mb-2">
                                                                        موعد الجلسة القادمة <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <DatePickerField
                                                                        value={hearingDraft.nextSessionDate || ''}
                                                                        min={hearingDraft.sessionDate || undefined}
                                                                        onValueChange={(v) => setHearingDraft((s) => ({ ...s, nextSessionDate: v }))}
                                                                        disabled={isFinalized}
                                                                        inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-blue-500/40 focus:outline-none"
                                                                    />
                                                                    {!!hearingDraftNextSessionDateError && (
                                                                        <div className="mt-1 text-red-200 text-xs font-bold">{hearingDraftNextSessionDateError}</div>
                                                                    )}
                                                                </div>
                                                            ) : null}
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setHearingDraft({
                                                                            open: false,
                                                                            stage: 'pre_decision',
                                                                            outcome: 'adjourn',
                                                                            sessionDate: '',
                                                                            notes: '',
                                                                            nextSessionDate: '',
                                                                            decisionDate: '',
                                                                        })
                                                                    }
                                                                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
                                                                >
                                                                    إغلاق
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={addHearing}
                                                                    disabled={
                                                                        isFinalized ||
                                                                        !!hearingDraftSessionDateError ||
                                                                        !!hearingDraftNextSessionDateError ||
                                                                        !!hearingDraftAdjournReasonError
                                                                    }
                                                                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    حفظ الجلسة
                                                                </button>
                                                            </div>
                                                        </div>
                                                        </div>
                                                    )}
                                                </div>
                                                )}

                                                {showJudgeDecisionBlock && (
                                                <motion.div className="decision-block border border-white/10 bg-white/5 rounded-xl p-4">
                                                    <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                        <FileCheck size={16} className="text-cyan-200" />
                                                        قرار القاضي
                                                    </div>

                                                    {showJudgeDecisionTerminateOnly ? (
                                                        <div className="mt-4 space-y-4">
                                                            <div className="border border-rose-500/25 bg-rose-500/10 rounded-lg px-3 py-2 text-rose-100 text-xs font-bold">
                                                                🛑 تم تسجيل جلسة إبطال الطلب. يمكنك إغلاق الإضبارة من الزر أدناه دون إدخال إجابة/رفض.
                                                            </div>
                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void handleJudgeDecisionSubmit(e);
                                                                    }}
                                                                    disabled={isFinalized}
                                                                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    🔒 حفظ وإغلاق الإضبارة
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : showJudgeDecisionFullForm ? (
                                                        <div className="mt-4 space-y-4">
                                                            <div className="space-y-3">
                                                                {isIqrarContext ? (
                                                                    <label className="flex items-center gap-3 p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={judgeDecision.decision === 'accepted'}
                                                                            onChange={(e) =>
                                                                                setJudgeDecision((prev) => ({
                                                                                    ...prev,
                                                                                    decision: e.target.checked ? 'accepted' : null,
                                                                                    requiresGuarantee: false,
                                                                                }))
                                                                            }
                                                                            disabled={isFinalized}
                                                                            className="accent-emerald-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">
                                                                                تم إصدار حجة الإقرار والمصادقة عليها
                                                                            </p>
                                                                        </div>
                                                                    </label>
                                                                ) : (
                                                                    <>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="accepted"
                                                                        checked={judgeDecision.decision === 'accepted'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'accepted',
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-emerald-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">إجابة الطلب</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="partially_accepted"
                                                                        checked={judgeDecision.decision === 'partially_accepted'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'partially_accepted',
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-cyan-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">إجابة جزئية</p>
                                                                    </div>
                                                                </label>
                                                                <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                    <input
                                                                        type="radio"
                                                                        name="judgeDecision"
                                                                        value="rejected"
                                                                        checked={judgeDecision.decision === 'rejected'}
                                                                        onChange={() =>
                                                                            setJudgeDecision((prev) => ({
                                                                                ...prev,
                                                                                decision: 'rejected',
                                                                                requiresGuarantee: false,
                                                                            }))
                                                                        }
                                                                        disabled={isFinalized}
                                                                        className="accent-rose-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="text-white font-bold">رفض الطلب</p>
                                                                    </div>
                                                                </label>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-white/70 text-sm mb-2">
                                                                    {isIqrarContext ? (
                                                                        <>
                                                                            تاريخ المصادقة على الحجة{' '}
                                                                            <span className="text-red-400">*</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            تاريخ قرار القاضي{' '}
                                                                            <span className="text-red-400">*</span>
                                                                        </>
                                                                    )}
                                                                </label>
                                                                <DatePickerField
                                                                    value={judgeDecision.decisionDate || ''}
                                                                    onValueChange={(v) => setJudgeDecision((prev) => ({ ...prev, decisionDate: v }))}
                                                                    min={phase1JudgeDecisionMinYmd || undefined}
                                                                    disabled={isFinalized || !judgeDecision.decision}
                                                                    inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-cyan-500/40 focus:outline-none"
                                                                />
                                                                {!!judgeDecisionDateChronologyError && (
                                                                    <div className="mt-1 text-red-200 text-xs font-bold">{judgeDecisionDateChronologyError}</div>
                                                                )}
                                                            </div>

                                                            {!isIqrarContext &&
                                                            (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && (
                                                                <div className="space-y-3 border border-white/10 bg-black/20 rounded-xl p-4">
                                                                    <div className="text-white font-bold text-sm">الكفالة الضامنة</div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name="judgeGuarantee"
                                                                                checked={judgeDecision.requiresGuarantee}
                                                                                onChange={() => setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: true }))}
                                                                                disabled={isFinalized}
                                                                                className="accent-amber-500"
                                                                            />
                                                                            <span className="text-white text-sm font-bold">الكفالة مطلوبة</span>
                                                                        </label>
                                                                        <label className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg cursor-pointer">
                                                                            <input
                                                                                type="radio"
                                                                                name="judgeGuarantee"
                                                                                checked={!judgeDecision.requiresGuarantee}
                                                                                onChange={() => {
                                                                                    setJudgeDecision((prev) => ({ ...prev, requiresGuarantee: false }));
                                                                                    setGuaranteeSubmitted(false);
                                                                                }}
                                                                                disabled={isFinalized}
                                                                                className="accent-slate-400"
                                                                            />
                                                                            <span className="text-white text-sm font-bold">لا توجد كفالة</span>
                                                                        </label>
                                                                    </div>
                                                                    {judgeDecision.requiresGuarantee && (
                                                                        <div className="space-y-3">
                                                                            <div>
                                                                                <label className="block text-white/70 text-sm mb-2">
                                                                                    مبلغ الكفالة <span className="text-red-400">*</span>
                                                                                </label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={guaranteeDetails.amount}
                                                                                    onChange={(e) => {
                                                                                        const amount = e.target.value;
                                                                                        setGuaranteeDetails((prev) => ({ ...prev, amount }));
                                                                                        if (!String(amount || '').trim()) setGuaranteeSubmitted(false);
                                                                                    }}
                                                                                    disabled={isFinalized}
                                                                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-amber-500/40 focus:outline-none"
                                                                                />
                                                                            </div>
                                                                            <label
                                                                                className={`flex items-center gap-2 text-sm font-bold ${
                                                                                    String(guaranteeDetails.amount || '').trim()
                                                                                        ? 'text-white cursor-pointer'
                                                                                        : 'text-white/40 cursor-not-allowed'
                                                                                }`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={guaranteeSubmitted}
                                                                                    onChange={(e) => {
                                                                                        if (!String(guaranteeDetails.amount || '').trim()) return;
                                                                                        setGuaranteeSubmitted(e.target.checked);
                                                                                    }}
                                                                                    disabled={isFinalized || !String(guaranteeDetails.amount || '').trim()}
                                                                                    className="accent-emerald-500 disabled:opacity-40"
                                                                                />
                                                                                تم إيداع الكفالة
                                                                            </label>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void clearJudgeDecision(e);
                                                                    }}
                                                                    className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold"
                                                                >
                                                                    إلغاء
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        void handleJudgeDecisionSubmit(e);
                                                                    }}
                                                                    disabled={isFinalized || !!judgeDecisionDateChronologyError}
                                                                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    🔒 حفظ قرار القاضي
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </motion.div>
                                                )}
                                            </div>

                                            {isStateOrder && !isCaseTerminated && !hasIntervention && !defenderPhase1ReadOnly ? (
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => void registerOpponentIntervention()}
                                                        disabled={isFinalized}
                                                        className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        تسجيل تدخل الخصم والتحويل لمسار وجاهي
                                                    </button>
                                                </div>
                                            ) : null}
                                            {isStateOrder && !isCaseTerminated && hasIntervention && !defenderPhase1ReadOnly ? (
                                                <div className="flex items-center justify-end">
                                                    <div className="px-4 py-2 rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-100 text-xs font-bold">
                                                        ✓ تم تسجيل تدخل الخصم — المسار وجاهي
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                            )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
    );
}
