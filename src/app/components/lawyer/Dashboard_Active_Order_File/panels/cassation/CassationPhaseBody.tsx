import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ValidationBanner } from '../../components/ValidationBanner';
import { DatePickerField } from '../../components/DatePickerField';
import { formatDateText, cassationDecisionText } from '../../utils/formatters';
import type { CassationLifecyclePanelProps } from '../CassationLifecyclePanelProps';

export function CassationPhaseBody(props: CassationLifecyclePanelProps) {
    const {
        caseData,
        cassationData,
        cassationDecision,
        cassationDecisionDateError,
        cassationDecisionError,
        cassationDecisionGateRef,
        cassationDecisionMinYmd,
        cassationError,
        cassationExpiredCanClose,
        cassationExpiredConfirmed,
        cassationFilingAfterDeadline,
        cassationFilingDateChronologyError,
        cassationFilingGateRef,
        cassationFilingMinYmd,
        cassationLegalEndDate,
        cassationPhaseFinalizeReady,
        clearCassation,
        computedCassationFiledBy,
        editCassation,
        handleCassationPhaseSubmit,
        isFinalized,
        partyLabel,
        setActiveLifecycleStep,
        setCassationData,
        setCassationDecision,
        setCassationExpiredConfirmed,
        setEditCassation,
        showCassationDecisionPanel,
    } = props;

    return (
                                                <div ref={cassationFilingGateRef} className="space-y-6">
                                                    {!!cassationError && <ValidationBanner text={cassationError} />}
                                                    {isFinalized && (
                                                        <div className="border border-amber-500/25 bg-amber-500/10 rounded-xl px-4 py-3 text-amber-100 text-sm space-y-2">
                                                            <div className="font-extrabold">ملخص مرحلة الطعن التمييزي (للاطلاع)</div>
                                                            {cassationData.outcome === 'filed' && (
                                                                <div>
                                                                    الطعن: {partyLabel(computedCassationFiledBy)} — تاريخ{' '}
                                                                    {formatDateText(cassationData.filingDate) || '—'} — رقم{' '}
                                                                    {String(cassationData.fileNumber || '').trim() || '—'}
                                                                </div>
                                                            )}
                                                            {cassationData.outcome === 'expired' && (
                                                                <div>انقضاء مدة الطعن التمييزي دون تقديم</div>
                                                            )}
                                                            {cassationDecision.decision && (
                                                                <div>
                                                                    القرار: {cassationDecisionText(cassationDecision.decision)} —{' '}
                                                                    {formatDateText(cassationDecision.decisionDate) || '—'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!isFinalized && (
                                                    <>
                                                    <div className="space-y-3">
                                                        <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                            <input
                                                                type="radio"
                                                                name="cassationOutcome"
                                                                value="filed"
                                                                checked={cassationData.outcome === 'filed'}
                                                                onChange={() => {
                                                                    setCassationExpiredConfirmed(false);
                                                                    setCassationData({ ...cassationData, outcome: 'filed' });
                                                                }}
                                                                disabled={(!!caseData?.cassationOutcome || !!caseData?.cassationDecision) && !editCassation}
                                                                className="accent-purple-500"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-white font-bold">تم تقديم طعن تمييزي</p>
                                                            </div>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                            <input
                                                                type="radio"
                                                                name="cassationOutcome"
                                                                value="expired"
                                                                checked={cassationData.outcome === 'expired'}
                                                                onChange={() => {
                                                                    setCassationExpiredConfirmed(false);
                                                                    setCassationData({ ...cassationData, outcome: 'expired' });
                                                                }}
                                                                disabled={(!!caseData?.cassationOutcome || !!caseData?.cassationDecision) && !editCassation}
                                                                className="accent-slate-400"
                                                            />
                                                            <div className="flex-1">
                                                                <p className="text-white font-bold">انقضت المدة دون طعن</p>
                                                            </div>
                                                        </label>
                                                    </div>

                                                    <AnimatePresence mode="wait" initial={false}>
                                                        {cassationData.outcome === 'filed' ? (
                                                            <motion.div
                                                                key="cassation-filed"
                                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-4 space-y-4">
                                                                    <div className="bg-black/20 border border-white/10 rounded-lg p-3">
                                                                        <div className="text-white/60 text-xs mb-1">مقدّم الطعن (محسوب تلقائياً)</div>
                                                                        <div className="text-white font-bold">{partyLabel(computedCassationFiledBy)}</div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                        <div>
                                                                            <label className="block text-white/70 text-sm mb-2">
                                                                                تاريخ تقديم الطعن <span className="text-red-400">*</span>
                                                                            </label>
                                                                            <DatePickerField
                                                                                value={cassationData.filingDate || ''}
                                                                                onValueChange={(v) => setCassationData({ ...cassationData, filingDate: v })}
                                                                                min={cassationFilingMinYmd || undefined}
                                                                                disabled={(!!caseData?.cassationOutcome || !!caseData?.cassationDecision) && !editCassation}
                                                                                inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500/50 focus:outline-none"
                                                                            />
                                                                            {!!cassationFilingDateChronologyError && (
                                                                                <div className="mt-1 text-red-200 text-xs font-bold">{cassationFilingDateChronologyError}</div>
                                                                            )}
                                                                            {cassationFilingAfterDeadline ? (
                                                                                <div className="mt-2 border border-amber-500/35 bg-amber-500/10 rounded-lg px-3 py-2 text-amber-100 text-xs font-bold">
                                                                                    ⚠️ انتباه: تم تقديم الطعن خارج المدة القانونية المحددة
                                                                                    {cassationLegalEndDate
                                                                                        ? ` (انتهاء المدة: ${formatDateText(cassationLegalEndDate)})`
                                                                                        : ''}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                        <div>
                                                                            <label className="block text-white/70 text-sm mb-2">
                                                                                رقم الطعن <span className="text-red-400">*</span>
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                value={cassationData.fileNumber}
                                                                                onChange={(e) => setCassationData({ ...cassationData, fileNumber: e.target.value })}
                                                                                placeholder="مثال: 2026/تمييز/123"
                                                                                disabled={isFinalized || ((!!caseData?.cassationOutcome || !!caseData?.cassationDecision) && !editCassation)}
                                                                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ) : null}
                                                        {cassationData.outcome === 'expired' ? (
                                                            <motion.div
                                                                key="cassation-expired"
                                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                                transition={{ duration: 0.22, ease: 'easeInOut' }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="mt-4 space-y-3">
                                                                    <div
                                                                        className={`border rounded-xl px-4 py-3 ${
                                                                            cassationExpiredCanClose ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-amber-500/25 bg-amber-500/10'
                                                                        }`}
                                                                    >
                                                                        <div className="text-white text-sm font-bold">
                                                                            {cassationExpiredCanClose ? '✅ انقضت المدة القانونية. يمكن إغلاق الإضبارة.' : '⏳ لا يمكن تثبيت الانقضاء قبل انقضاء المدة القانونية.'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col items-end gap-1">
                                                                        {!cassationExpiredConfirmed ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    if (!cassationExpiredCanClose) return;
                                                                                    setCassationExpiredConfirmed(true);
                                                                                }}
                                                                                disabled={isFinalized || !cassationExpiredCanClose}
                                                                                title={
                                                                                    !cassationExpiredCanClose
                                                                                        ? 'لا يمكن تأكيد الانقضاء إلا بعد تجاوز التاريخ المحدد'
                                                                                        : undefined
                                                                                }
                                                                                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            >
                                                                                ✔️ تأكيد انقضاء المدة
                                                                            </button>
                                                                        ) : null}
                                                                        {!cassationExpiredCanClose ? (
                                                                            <p className="text-white/50 text-xs max-w-md text-right">
                                                                                لا يمكن تأكيد الانقضاء إلا بعد تجاوز التاريخ المحدد
                                                                                {cassationLegalEndDate
                                                                                    ? ` (${formatDateText(cassationLegalEndDate)})`
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
                                                        {showCassationDecisionPanel ? (
                                                            <motion.div
                                                                key="cassation-decision"
                                                                ref={cassationDecisionGateRef}
                                                                initial={{ opacity: 0, y: -8, height: 0 }}
                                                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                                                exit={{ opacity: 0, y: -8, height: 0 }}
                                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                                className="pt-6 border-t border-white/10 space-y-4 overflow-hidden"
                                                            >
                                                                {!!cassationDecisionError && <ValidationBanner text={cassationDecisionError} />}
                                                                <div className="text-white font-bold text-sm">نتيجة التمييز</div>
                                                                <div className="space-y-3">
                                                                    <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="radio"
                                                                            name="cassationDecision"
                                                                            value="confirmed"
                                                                            checked={cassationDecision.decision === 'confirmed'}
                                                                            onChange={() => setCassationDecision({ ...cassationDecision, decision: 'confirmed' })}
                                                                            className="accent-emerald-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">تصديق القرار</p>
                                                                        </div>
                                                                    </label>
                                                                    <label className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg cursor-pointer transition-all">
                                                                        <input
                                                                            type="radio"
                                                                            name="cassationDecision"
                                                                            value="canceled"
                                                                            checked={cassationDecision.decision === 'canceled' || cassationDecision.decision === 'modified'}
                                                                            onChange={() => setCassationDecision({ ...cassationDecision, decision: 'canceled' })}
                                                                            className="accent-red-500"
                                                                        />
                                                                        <div className="flex-1">
                                                                            <p className="text-white font-bold">نقض القرار</p>
                                                                        </div>
                                                                    </label>
                                                                </div>
                                                                <div>
                                                                    <label className="block text-white/70 text-sm mb-2">
                                                                        تاريخ قرار التمييز <span className="text-red-400">*</span>
                                                                    </label>
                                                                    <DatePickerField
                                                                        value={cassationDecision.decisionDate || ''}
                                                                        min={cassationDecisionMinYmd || undefined}
                                                                        onValueChange={(v) => setCassationDecision({ ...cassationDecision, decisionDate: v })}
                                                                        inputClassName="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-purple-500/50 focus:outline-none"
                                                                    />
                                                                    {!!cassationDecisionDateError && (
                                                                        <div className="mt-1 text-red-200 text-xs font-bold">{cassationDecisionDateError}</div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        ) : null}
                                                    </AnimatePresence>

                                                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                clearCassation();
                                                            }}
                                                            className="px-3 py-2 text-white/60 hover:text-white transition-colors font-bold"
                                                        >
                                                            إلغاء
                                                        </button>
                                                        {editCassation && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditCassation(false);
                                                                    setActiveLifecycleStep(null);
                                                                }}
                                                                className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                            >
                                                                إغلاق
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveLifecycleStep(null)}
                                                            className="px-6 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                                                        >
                                                            طيّ
                                                        </button>
                                                        {cassationPhaseFinalizeReady && (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    handleCassationPhaseSubmit(e);
                                                                }}
                                                                disabled={isFinalized}
                                                                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {cassationData.outcome === 'expired'
                                                                    ? '🔒 حفظ وإنهاء الإضبارة'
                                                                    : '🔒 تثبيت مرحلة الطعن التمييزي'}
                                                            </button>
                                                        )}
                                                    </div>
                                                    </>
                                                    )}
                                                </div>
    );
}
