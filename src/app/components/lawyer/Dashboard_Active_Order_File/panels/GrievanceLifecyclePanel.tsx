import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Scale, ChevronDown } from 'lucide-react';
import { ValidationBanner } from '../components/ValidationBanner';
import { DatePickerField } from '../components/DatePickerField';
import { formatDateText } from '../utils/formatters';
import type { GrievanceLifecyclePanelProps } from './GrievanceLifecyclePanelProps';

export type { GrievanceLifecyclePanelProps } from './GrievanceLifecyclePanelProps';

export function GrievanceLifecyclePanel(props: GrievanceLifecyclePanelProps) {
    const {
        activeLifecycleStep,
        addHearing,
        caseData,
        clearGrievance,
        computedGrievanceFiledBy,
        confirmGrievanceDetails,
        confirmGrievanceTiming,
        defenderPhase2ReadOnly,
        defenderStateOrderSummaryDate,
        editGrievance,
        effectiveJudgeDecisionDate,
        effectiveRejectionNotificationDate,
        grievanceData,
        grievanceDecision,
        grievanceDecisionDateChronologyError,
        grievanceDecisionError,
        grievanceDecisionMinYmd,
        grievanceDecisionNotificationConfirmed,
        grievanceError,
        grievanceExpiredCanClose,
        grievanceExpiredConfirmed,
        grievanceFilingDateChronologyError,
        grievanceFilingMinYmd,
        grievanceFinalGateRef,
        grievanceFirstHearingDateChronologyError,
        grievanceFirstHearingMinYmd,
        grievanceHearingsGateRef,
        grievanceHearingsSorted,
        grievanceInHearings,
        grievanceLegalEndDate,
        grievanceLegalEndDateChronologyError,
        grievanceLegalEndMinYmd,
        grievanceLockedSummaryText,
        grievanceOutcomeGateRef,
        grievanceProceedingsClosed,
        grievanceRef,
        grievanceStepNumber,
        grievanceTimingConfirmed,
        grievanceTimingGateReady,
        grievanceWizardInputsLocked,
        handleGrievanceSubmit,
        hasIntervention,
        hearingDraft,
        hearingDraftAdjournReasonError,
        hearingDraftNextSessionDateError,
        hearingDraftSessionDateError,
        hearingsError,
        isFinalityNoGrievance,
        isFinalized,
        partyLabel,
        persistGrievanceOutcomeDraft,
        phase2ActiveDate,
        phase2FirstHearingDate,
        phase2NewSessionMinYmd,
        setActiveLifecycleStep,
        setDecisionNotificationModalOpen,
        setEditGrievance,
        setGrievanceData,
        setGrievanceDecision,
        setGrievanceDetailsConfirmed,
        setGrievanceExpiredConfirmed,
        setGrievanceLegalEndDate,
        setHearingDraft,
        setPhase2FirstHearingDate,
        showGrievanceDecisionForm,
        showGrievanceDetailsForm,
        showGrievanceDetailsSummary,
        showGrievanceFinalizeButton,
        showGrievanceOutcomeForm,
        showGrievanceOutcomeSummary,
        showGrievancePhase2AdjournBanner,
        showGrievanceTimingForm,
        showGrievanceTimingSummary,
        toggleLifecycleStep,
        updatePhase2FirstHearingDate,
    } = props;

    const [grievanceDigestOpen, setGrievanceDigestOpen] = useState(true);
    const hasGrievanceDigest =
        showGrievanceTimingSummary || showGrievanceOutcomeSummary || showGrievanceDetailsSummary;

    return (
                                <div ref={grievanceRef} className="border rounded-xl overflow-hidden border-orange-500/30">
                                    <button
                                        type="button"
                                        onClick={() => toggleLifecycleStep('grievance')}
                                        className="w-full px-4 py-4 flex items-center justify-between gap-3 text-right bg-gradient-to-r from-orange-900/30 to-red-900/20 hover:from-orange-900/40 hover:to-red-900/30 group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center border border-orange-500/40 bg-orange-500/10">
                                                <span className="text-sm font-extrabold text-white">{grievanceStepNumber}</span>
                                            </div>
                                            <div>
                                                <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                    <Scale size={18} className="text-orange-300" />
                                                    مرحلة التظلم
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-white/60 text-xs">
                                            {caseData?.grievanceOutcome === 'expired' || caseData?.grievanceDecision
                                                ? '✅'
                                                : caseData?.grievanceOutcome === 'filed'
                                                  ? '⏳'
                                                  : activeLifecycleStep === 'grievance'
                                                    ? 'مفتوحة'
                                                    : '—'}
                                            {!isFinalized &&
                                                !defenderPhase2ReadOnly &&
                                                !caseData?.grievanceDecision &&
                                                caseData?.grievanceOutcome !== 'expired' &&
                                                !!caseData?.grievanceOutcome && (
                                                <span
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditGrievance(true);
                                                        setActiveLifecycleStep('grievance');
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded-md bg-transparent hover:bg-white/10 text-white text-[11px] font-bold"
                                                >
                                                    ✏️ تعديل
                                                </span>
                                            )}
                                            <ChevronDown
                                                size={18}
                                                className={`shrink-0 text-white/50 transition-transform duration-200 ${
                                                    activeLifecycleStep === 'grievance' ? 'rotate-180' : ''
                                                }`}
                                            />
                                        </div>
                                    </button>

                                    <AnimatePresence initial={false}>
                                        {activeLifecycleStep === 'grievance' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                className="px-4 py-5 bg-[#0B1021] border-t border-white/10"
                                            >
                                                <div className="space-y-6">
                                                    {!!grievanceError && <ValidationBanner text={grievanceError} />}
                                                    {!!grievanceDecisionError && <ValidationBanner text={grievanceDecisionError} />}
                                                    {!!hearingsError && <ValidationBanner text={hearingsError} />}

                                                    {isFinalized && (
                                                        <div className="border border-amber-500/25 bg-amber-500/10 rounded-xl px-4 py-3 text-amber-100 text-sm space-y-2">
                                                            <div className="font-extrabold">ملخص مرحلة التظلم (للاطلاع)</div>
                                                            {!!grievanceLockedSummaryText && <div>{grievanceLockedSummaryText}</div>}
                                                            {grievanceDecision.decision && (
                                                                <div>
                                                                    قرار التظلم:{' '}
                                                                    {grievanceDecision.decision === 'confirmed'
                                                                        ? 'تصديق القرار'
                                                                        : grievanceDecision.decision === 'modified'
                                                                          ? 'تعديل القرار'
                                                                          : 'نقض القرار'}{' '}
                                                                    — {formatDateText(grievanceDecision.decisionDate) || '—'}
                                                                </div>
                                                            )}
                                                            {caseData?.grievanceOutcome === 'expired' && (
                                                                <div>انقضاء مدة التظلم دون تقديم طعن</div>
                                                            )}
                                                            {isFinalityNoGrievance && <div>اكتساب الدرجة القطعية دون تقديم تظلم</div>}
                                                        </div>
                                                    )}

                                                    {defenderPhase2ReadOnly && !isFinalized && (
                                                        <div className="border border-white/10 bg-white/5 rounded-xl px-4 py-3 text-white/90 text-sm space-y-2">
                                                            <div className="font-extrabold text-white">ملخص مرحلة التظلم (سجل تاريخي)</div>
                                                            <div>
                                                                صدر الأمر الولائي غيابياً بتاريخ{' '}
                                                                {formatDateText(defenderStateOrderSummaryDate) ||
                                                                    formatDateText(effectiveJudgeDecisionDate) ||
                                                                    '—'}
                                                                ؛ والقرار المعترض عليه: رفض الطلب بتاريخ{' '}
                                                                {formatDateText(effectiveJudgeDecisionDate) || '—'}.
                                                            </div>
                                                            {(grievanceDecision.decision || (caseData as any)?.grievanceDecision) && (
                                                                <div>
                                                                    قرار التظلم:{' '}
                                                                    {(grievanceDecision.decision || (caseData as any)?.grievanceDecision) === 'confirmed'
                                                                        ? 'تصديق القرار'
                                                                        : (grievanceDecision.decision || (caseData as any)?.grievanceDecision) === 'modified'
                                                                          ? 'تعديل القرار'
                                                                          : 'نقض القرار'}{' '}
                                                                    —{' '}
                                                                    {formatDateText(
                                                                        String(
                                                                            grievanceDecision.decisionDate ||
                                                                                (caseData as any)?.grievanceDecisionDate ||
                                                                                '',
                                                                        ),
                                                                    ) || '—'}
                                                                </div>
                                                            )}
                                                            {!!grievanceLockedSummaryText && (
                                                                <div className="text-white/70 text-xs">{grievanceLockedSummaryText}</div>
                                                            )}
                                                            <div className="text-white/50 text-xs">
                                                                مؤمن للتعديل لأن نقطة الدخول كانت عند التمييز؛ أكمل الإجراء في مرحلة الطعن التمييزي.
                                                            </div>
                                                        </div>
                                                    )}

                                                    {!isFinalized && !defenderPhase2ReadOnly && (
                                                    <motion.div ref={grievanceOutcomeGateRef} className="space-y-4">
                                                    {showGrievanceTimingForm ? (
                                                    <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-4">
                                                        <div className="text-white font-extrabold text-sm">1️⃣ التبليغ واحتساب مدة التظلم</div>
                                                        {!hasIntervention && (
                                                            <div className="border border-white/10 bg-black/20 rounded-lg p-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <div className="text-white/80 text-sm font-bold">تاريخ التبليغ بقرار القاضي</div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDecisionNotificationModalOpen(true)}
                                                                        disabled={grievanceWizardInputsLocked}
                                                                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {grievanceDecisionNotificationConfirmed ? '✏️ تعديل التبليغ' : 'تأكيد التبليغ'}
                                                                    </button>
                                                                </div>
                                                                <div className="mt-2 text-white/70 text-sm">
                                                                    {grievanceData.rejectionNotificationDate
                                                                        ? `التاريخ المعتمد: ${formatDateText(grievanceData.rejectionNotificationDate)}`
                                                                        : 'لم يتم تحديد تاريخ التبليغ بعد'}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <label className="block text-white/70 text-sm mb-2">
                                                                تاريخ انتهاء مدة التظلم القانونية <span className="text-red-400">*</span>
                                                            </label>
                                                            <DatePickerField
                                                                value={grievanceLegalEndDate || ''}
                                                                onValueChange={(v) => setGrievanceLegalEndDate(v)}
                                                                min={grievanceLegalEndMinYmd || undefined}
                                                                disabled={grievanceWizardInputsLocked}
                                                                inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
                                                            />
                                                            {!!grievanceLegalEndDateChronologyError && (
                                                                <div className="mt-1 text-red-200 text-xs font-bold">{grievanceLegalEndDateChronologyError}</div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => void confirmGrievanceTiming()}
                                                                disabled={grievanceWizardInputsLocked || !grievanceTimingGateReady}
                                                                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                ✅ تثبيت التوقيت القانوني
                                                            </button>
                                                        </div>
                                                        {!grievanceTimingGateReady ? (
                                                            <div className="text-white/50 text-xs font-bold">
                                                                {hasIntervention
                                                                    ? 'أدخل تاريخ انتهاء مدة التظلم ثم اضغط التثبيت.'
                                                                    : 'أكّد تاريخ التبليغ بقرار القاضي، ثم حدّد تاريخ انتهاء المدة.'}
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                    ) : null}

                                                    {hasGrievanceDigest ? (
                                                        <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl overflow-hidden">
                                                            <button
                                                                type="button"
                                                                onClick={() => setGrievanceDigestOpen((o) => !o)}
                                                                className="w-full px-4 py-3 flex items-center justify-between gap-3 text-right text-white/90 text-xs font-bold"
                                                            >
                                                                <span>📋 ملخص مرحلة التظلم</span>
                                                                <ChevronDown
                                                                    size={16}
                                                                    className={`shrink-0 text-white/60 transition-transform duration-200 ${
                                                                        grievanceDigestOpen ? 'rotate-180' : ''
                                                                    }`}
                                                                />
                                                            </button>
                                                            <AnimatePresence initial={false}>
                                                                {grievanceDigestOpen ? (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                        <motion.div className="px-4 pb-3 space-y-2 text-white/80 text-xs font-bold border-t border-white/10">
                                                                            {showGrievanceTimingSummary ? (
                                                                                <div>
                                                                                    📌 التوقيت القانوني:{' '}
                                                                                    {!hasIntervention
                                                                                        ? `التبليغ ${formatDateText(effectiveRejectionNotificationDate) || '—'} | `
                                                                                        : null}
                                                                                    الانتهاء {formatDateText(grievanceLegalEndDate) || '—'}
                                                                                </div>
                                                                            ) : null}
                                                                            {showGrievanceOutcomeSummary ? (
                                                                                <div className={showGrievanceTimingSummary ? 'pt-2 border-t border-white/10' : ''}>
                                                                                    حالة التظلم:{' '}
                                                                                    {grievanceData.outcome === 'filed'
                                                                                        ? 'تم تقديم تظلم'
                                                                                        : 'انقضت المدة دون تظلم'}
                                                                                </div>
                                                                            ) : null}
                                                                            {showGrievanceDetailsSummary ? (
                                                                                <div
                                                                                    className={
                                                                                        showGrievanceTimingSummary || showGrievanceOutcomeSummary
                                                                                            ? 'pt-2 border-t border-white/10 space-y-1'
                                                                                            : 'space-y-1'
                                                                                    }
                                                                                >
                                                                                    <div>
                                                                                        بيانات التظلم: {partyLabel(computedGrievanceFiledBy)} — تاريخ التقديم{' '}
                                                                                        {formatDateText(grievanceData.filingDate) || '—'}
                                                                                    </div>
                                                                                    <div>
                                                                                        تاريخ جلسة التظلم الأولى:{` `}
                                                                                        {formatDateText(
                                                                                            (caseData as any)?.grievanceFirstHearingDate ?? phase2FirstHearingDate,
                                                                                        ) || '—'}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null}
                                                                        </motion.div>
                                                                    </motion.div>
                                                                ) : null}
                                                            </AnimatePresence>
                                                        </div>
                                                    ) : null}

                                                    {showGrievanceOutcomeForm ? (
                                                    <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-3">
                                                        <div className="text-white font-extrabold text-sm">2️⃣ حالة التظلم</div>
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
                                                                        String((caseData as any)?.firstHearingDate ?? '')
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
                                                                            ? '✅ انقضت المدة القانونية. يمكن إغلاق مرحلة التظلم.'
                                                                            : '⏳ لا يمكن تثبيت الانقضاء قبل انقضاء المدة القانونية.'}
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
                                                                                ✔️ تأكيد انقضاء المدة
                                                                            </button>
                                                                        ) : (
                                                                            <div className="text-white/60 text-xs font-bold">
                                                                                ⬇️ يمكنك إغلاق الإضبارة من زر 🔒 حفظ وإنهاء الإضبارة أسفل المرحلة
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

                                                    <AnimatePresence initial={false}>
                                                        {grievanceData.outcome === 'filed' && grievanceTimingConfirmed ? (
                                                            <motion.div
                                                                key="grievance-filed"
                                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                className="overflow-hidden space-y-5"
                                                            >
                                                                {showGrievanceDetailsForm ? (
                                                                <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-4">
                                                                    <div className="text-white font-extrabold text-sm">3️⃣ بيانات التظلم</div>
                                                                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                                        <div className="text-white/60 text-xs mb-1">مقدّم التظلم (محسوب تلقائياً)</div>
                                                                        <div className="text-white font-bold">{partyLabel(computedGrievanceFiledBy)}</div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-white/70 text-sm mb-2">
                                                                            تاريخ تقديم التظلم <span className="text-red-400">*</span>
                                                                        </label>
                                                                        <DatePickerField
                                                                            value={grievanceData.filingDate || ''}
                                                                            onValueChange={(v) =>
                                                                                setGrievanceData((prev) => ({ ...prev, filingDate: v }))
                                                                            }
                                                                            min={grievanceFilingMinYmd || undefined}
                                                                            disabled={grievanceWizardInputsLocked || !grievanceTimingConfirmed}
                                                                            inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
                                                                        />
                                                                        {!!grievanceFilingDateChronologyError && (
                                                                            <div className="mt-1 text-red-200 text-xs font-bold">
                                                                                {grievanceFilingDateChronologyError}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-white/70 text-sm mb-2">
                                                                            تاريخ جلسة التظلم الأولى <span className="text-red-400">*</span>
                                                                        </label>
                                                                        <DatePickerField
                                                                            value={phase2FirstHearingDate || ''}
                                                                            onValueChange={updatePhase2FirstHearingDate}
                                                                            min={grievanceFirstHearingMinYmd || undefined}
                                                                            disabled={grievanceWizardInputsLocked || !grievanceTimingConfirmed}
                                                                            inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
                                                                        />
                                                                        {!!grievanceFirstHearingDateChronologyError && (
                                                                            <div className="mt-1 text-red-200 text-xs font-bold">
                                                                                {grievanceFirstHearingDateChronologyError}
                                                                            </div>
                                                                        )}
                                                                        <p className="text-white/45 text-xs mt-2">
                                                                            تاريخ مستقل عن مرحلة ما قبل القرار — لا يُنسخ من تاريخ المرافعة الأولى.
                                                                        </p>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-2">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => void confirmGrievanceDetails()}
                                                                            disabled={
                                                                                grievanceWizardInputsLocked ||
                                                                                !grievanceTimingConfirmed ||
                                                                                !String(grievanceData.filingDate || '').trim() ||
                                                                                !String(phase2FirstHearingDate || '')
                                                                                    .trim()
                                                                                    .match(/^\d{4}-\d{2}-\d{2}$/) ||
                                                                                !!grievanceFilingDateChronologyError ||
                                                                                !!grievanceFirstHearingDateChronologyError
                                                                            }
                                                                            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            ✅ تثبيت بيانات التظلم
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                                ) : null}

                                                                <AnimatePresence initial={false}>
                                                                    {grievanceInHearings && (
                                                                        <div ref={grievanceHearingsGateRef}>
                                                                        <motion.div
                                                                            initial={{ opacity: 0, y: -8, height: 0 }}
                                                                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                            exit={{ opacity: 0, y: -8, height: 0 }}
                                                                            transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                            className="overflow-hidden border border-white/10 bg-white/5 rounded-xl p-4"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="text-white font-extrabold text-sm flex items-center gap-2">
                                                                                    <Calendar size={16} className="text-orange-200" />
                                                                                    سجل جلسات التظلم
                                                                                </div>
                                                                                {!isFinalized && !grievanceProceedingsClosed && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setHearingDraft({
                                                                                                open: true,
                                                                                                stage: 'grievance',
                                                                                                outcome: 'adjourn',
                                                                                                sessionDate: '',
                                                                                                notes: '',
                                                                                                nextSessionDate: '',
                                                                                                decisionDate: '',
                                                                                            })
                                                                                        }
                                                                                        disabled={grievanceWizardInputsLocked}
                                                                                        className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                    >
                                                                                        <Plus size={14} />
                                                                                        إضافة جلسة
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {showGrievancePhase2AdjournBanner ? (
                                                                                <div className="mt-3 text-white/50 text-xs font-bold">
                                                                                    الموعد المعتمد بعد التأجيلات: {formatDateText(phase2ActiveDate)}
                                                                                </div>
                                                                            ) : null}

                                                                            <div className="mt-4 space-y-2">
                                                                                {grievanceHearingsSorted.length === 0 ? (
                                                                                    <div className="text-white/50 text-sm">لا توجد جلسات مسجلة</div>
                                                                                ) : (
                                                                                    grievanceHearingsSorted.map((h) => {
                                                                                        const notes = String(h.notes || '');
                                                                                        const isClosing =
                                                                                            notes.includes('ختام المرافعة') ||
                                                                                            notes.includes('ختام وتعيين يوم للقرار') ||
                                                                                            notes.includes('ختام المرافعة وتحديد موعد القرار') ||
                                                                                            !String(h.nextSessionDate || '').trim();
                                                                                        return (
                                                                                            <div key={h.id} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                                                                <div className="flex flex-row-reverse items-start gap-3">
                                                                                                    <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${isClosing ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                                                                                                    <div className="flex-1">
                                                                                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                                            <div className="text-white font-bold text-sm">
                                                                                                                جلسة: {formatDateText(h.sessionDate) || '—'}
                                                                                                            </div>
                                                                                                            {String(h.nextSessionDate || '').trim() ? (
                                                                                                                <span className="text-[11px] bg-orange-500/10 border border-orange-500/20 text-orange-100 px-2 py-0.5 rounded-full">
                                                                                                                    تأجيل إلى: {formatDateText(h.nextSessionDate)}
                                                                                                                </span>
                                                                                                            ) : (
                                                                                                                <span className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 px-2 py-0.5 rounded-full">
                                                                                                                    ختام المرافعة
                                                                                                                </span>
                                                                                                            )}
                                                                                                        </div>
                                                                                                        {notes ? <div className="text-white/70 text-sm mt-2">{notes}</div> : null}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })
                                                                                )}
                                                                            </div>

                                                                            {hearingDraft.open && hearingDraft.stage === 'grievance' && (
                                                                                <div className="mt-3 border border-white/10 bg-black/20 rounded-xl p-4 space-y-3">
                                                                                    <div className="space-y-3">
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                                            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                                                <input
                                                                                                    type="radio"
                                                                                                    name="grievanceHearingOutcome"
                                                                                                    value="adjourn"
                                                                                                    checked={hearingDraft.outcome === 'adjourn'}
                                                                                                    onChange={() =>
                                                                                                        setHearingDraft((s) => ({
                                                                                                            ...s,
                                                                                                            outcome: 'adjourn',
                                                                                                            notes: '',
                                                                                                        }))
                                                                                                    }
                                                                                                    disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                    className="accent-orange-500"
                                                                                                />
                                                                                                <div className="flex-1">
                                                                                                    <p className="text-white font-bold">تأجيل إلى موعد آخر</p>
                                                                                                </div>
                                                                                            </label>
                                                                                            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                                                <input
                                                                                                    type="radio"
                                                                                                    name="grievanceHearingOutcome"
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
                                                                                                    disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                    className="accent-emerald-500"
                                                                                                />
                                                                                                <div className="flex-1">
                                                                                                    <p className="text-white font-bold">ختام المرافعة</p>
                                                                                                </div>
                                                                                            </label>
                                                                                        </div>

                                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                            <div>
                                                                                                <label className="block text-white/70 text-sm mb-2">تاريخ الجلسة</label>
                                                                                                <DatePickerField
                                                                                                    value={hearingDraft.sessionDate || ''}
                                                                                                    onValueChange={(v) => setHearingDraft((s) => ({ ...s, sessionDate: v }))}
                                                                                                    min={phase2NewSessionMinYmd || undefined}
                                                                                                    disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                    inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
                                                                                                />
                                                                                                {!!hearingDraftSessionDateError && (
                                                                                                    <div className="mt-1 text-red-200 text-xs font-bold">{hearingDraftSessionDateError}</div>
                                                                                                )}
                                                                                            </div>
                                                                                            {hearingDraft.outcome === 'adjourn' ? (
                                                                                                <div className="md:col-span-2">
                                                                                                    <label className="block text-white/70 text-sm mb-2">سبب التأجيل</label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={hearingDraft.notes}
                                                                                                        onChange={(e) => setHearingDraft((s) => ({ ...s, notes: e.target.value }))}
                                                                                                        disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
                                                                                                    />
                                                                                                    {!!hearingDraftAdjournReasonError && (
                                                                                                        <div className="mt-1 text-red-200 text-xs font-bold">{hearingDraftAdjournReasonError}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                            ) : null}
                                                                                        </div>
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
                                                                                                disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-orange-500/40 focus:outline-none"
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
                                                                                                    stage: 'grievance',
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
                                                                                                grievanceWizardInputsLocked ||
                                                                                                !!hearingDraftSessionDateError ||
                                                                                                !!hearingDraftNextSessionDateError ||
                                                                                                !!hearingDraftAdjournReasonError
                                                                                            }
                                                                                            className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-sm font-extrabold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                        >
                                                                                            حفظ الجلسة
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            <div className="mt-3 text-white/60 text-xs">
                                                                                الموعد القادم المعتمد للحساب: {phase2ActiveDate ? formatDateText(phase2ActiveDate) : '—'}
                                                                            </div>
                                                                        </motion.div>
                                                                        </div>
                                                                    )}
                                                                </AnimatePresence>

                                                                {showGrievanceDecisionForm ? (
                                                                    <div ref={grievanceFinalGateRef} className="mt-5 border border-white/10 bg-white/5 rounded-xl p-4 space-y-4">
                                                                        <div className="text-white font-extrabold text-sm">4️⃣ ⚖️ قرار قاضي التظلم (نهاية المرحلة)</div>
                                                                        <div className="space-y-3">
                                                                            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="grievanceDecision"
                                                                                    value="confirmed"
                                                                                    checked={grievanceDecision.decision === 'confirmed'}
                                                                                    onChange={() => setGrievanceDecision({ ...grievanceDecision, decision: 'confirmed' })}
                                                                                    disabled={grievanceWizardInputsLocked}
                                                                                    className="accent-emerald-500"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="text-white font-bold">تأييد الأمر الولائي</p>
                                                                                </div>
                                                                            </label>
                                                                            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="grievanceDecision"
                                                                                    value="canceled"
                                                                                    checked={grievanceDecision.decision === 'canceled'}
                                                                                    onChange={() => setGrievanceDecision({ ...grievanceDecision, decision: 'canceled' })}
                                                                                    disabled={grievanceWizardInputsLocked}
                                                                                    className="accent-red-500"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="text-white font-bold">إلغاء الأمر الولائي</p>
                                                                                </div>
                                                                            </label>
                                                                            <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                                <input
                                                                                    type="radio"
                                                                                    name="grievanceDecision"
                                                                                    value="modified"
                                                                                    checked={grievanceDecision.decision === 'modified'}
                                                                                    onChange={() => setGrievanceDecision({ ...grievanceDecision, decision: 'modified' })}
                                                                                    disabled={grievanceWizardInputsLocked}
                                                                                    className="accent-amber-500"
                                                                                />
                                                                                <div className="flex-1">
                                                                                    <p className="text-white font-bold">تعديل الأمر الولائي</p>
                                                                                </div>
                                                                            </label>
                                                                        </div>

                                                                        <div>
                                                                            <label className="block text-white/70 text-sm mb-2">
                                                                                تاريخ صدور قرار التظلم <span className="text-red-400">*</span>
                                                                            </label>
                                                                            <DatePickerField
                                                                                value={grievanceDecision.decisionDate || ''}
                                                                                onValueChange={(v) => setGrievanceDecision({ ...grievanceDecision, decisionDate: v })}
                                                                                min={grievanceDecisionMinYmd || undefined}
                                                                                disabled={grievanceWizardInputsLocked || !grievanceDecision.decision}
                                                                                inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500/50 focus:outline-none"
                                                                            />
                                                                            {!!grievanceDecisionDateChronologyError && (
                                                                                <div className="mt-1 text-red-200 text-xs font-bold">
                                                                                    {grievanceDecisionDateChronologyError}
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                    </div>
                                                                ) : null}
                                                            </motion.div>
                                                        ) : null}
                                                    </AnimatePresence>
                                                    </motion.div>
                                                    )}

                                                    {showGrievanceFinalizeButton && (
                                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                void clearGrievance(e);
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
                                                                handleGrievanceSubmit(e);
                                                            }}
                                                            disabled={isFinalized}
                                                            className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {grievanceData.outcome === 'expired' ? '🔒 حفظ وإنهاء الإضبارة' : '🔒 حفظ وإنهاء مرحلة التظلم'}
                                                        </button>
                                                        {editGrievance && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditGrievance(false);
                                                                    setActiveLifecycleStep(null);
                                                                }}
                                                                className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                            >
                                                                إغلاق
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const pending = caseData?.grievanceOutcome === 'filed' && !caseData?.grievanceDecision;
                                                                if (pending) return;
                                                                setActiveLifecycleStep(null);
                                                            }}
                                                            className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                        >
                                                            طيّ
                                                        </button>
                                                    </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
    );
}
