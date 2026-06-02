import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus } from 'lucide-react';
import { DatePickerField } from '../../components/DatePickerField';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievanceFiledHearingsSection(props: GrievanceLifecyclePanelProps) {
    const {
        addHearing,
        grievanceHearingsGateRef,
        grievanceHearingsSorted,
        grievanceInHearings,
        grievanceProceedingsClosed,
        grievanceWizardInputsLocked,
        hearingDraft,
        hearingDraftAdjournReasonError,
        hearingDraftNextSessionDateError,
        hearingDraftSessionDateError,
        isFinalized,
        phase2ActiveDate,
        phase2NewSessionMinYmd,
        setHearingDraft,
        showGrievancePhase2AdjournBanner,
    } = props;

    return (
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
    );
}
