import React from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { DatePickerField } from '../../components/DatePickerField';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import {
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_INPUT,
    URGENT_DOSSIER_PILL_BASE,
    URGENT_DOSSIER_PILL_IDLE,
} from '../../layout/urgentDossierUi';

const HEARING_OUTCOME_OPTIONS: Array<{
    value: 'adjourn' | 'close';
    label: string;
    active: string;
}> = [
    { value: 'adjourn', label: 'تأجيل إلى موعد آخر', active: 'border-amber-500/45 bg-amber-500/15 text-amber-100' },
    { value: 'close', label: 'ختام المرافعة', active: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100' },
];

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
                                                                            className="overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3"
                                                                        >
                                                                            <div className="flex items-center justify-between gap-3">
                                                                                <div className="text-xs font-bold text-white/80">سجل جلسات التظلم</div>
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
                                                                                        className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[44px] py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                                    >
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
                                                                                <div className="mt-3 rounded-lg border border-white/[0.08] bg-[#0A0F1C]/40 px-3 py-3 space-y-3">
                                                                                    <div className="space-y-3">
                                                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                                            {HEARING_OUTCOME_OPTIONS.map((opt) => {
                                                                                                const selected = hearingDraft.outcome === opt.value;
                                                                                                return (
                                                                                                    <button
                                                                                                        key={opt.value}
                                                                                                        type="button"
                                                                                                        disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                        onClick={() =>
                                                                                                            setHearingDraft((s) => ({
                                                                                                                ...s,
                                                                                                                outcome: opt.value,
                                                                                                                notes: opt.value === 'close' ? '' : s.notes,
                                                                                                                nextSessionDate:
                                                                                                                    opt.value === 'close' ? '' : s.nextSessionDate,
                                                                                                            }))
                                                                                                        }
                                                                                                        className={`${URGENT_DOSSIER_PILL_BASE} ${
                                                                                                            selected ? opt.active : URGENT_DOSSIER_PILL_IDLE
                                                                                                        }`}
                                                                                                    >
                                                                                                        {opt.label}
                                                                                                    </button>
                                                                                                );
                                                                                            })}
                                                                                        </div>

                                                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                            <div>
                                                                                                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                                                                                                    تاريخ الجلسة
                                                                                                </label>
                                                                                                <DatePickerField
                                                                                                    value={hearingDraft.sessionDate || ''}
                                                                                                    onValueChange={(v) => setHearingDraft((s) => ({ ...s, sessionDate: v }))}
                                                                                                    min={phase2NewSessionMinYmd || undefined}
                                                                                                    disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                    inputClassName={URGENT_DOSSIER_INPUT}
                                                                                                />
                                                                                                {!!hearingDraftSessionDateError && (
                                                                                                    <div className="mt-1 text-red-200 text-xs font-bold">{hearingDraftSessionDateError}</div>
                                                                                                )}
                                                                                            </div>
                                                                                            {hearingDraft.outcome === 'adjourn' ? (
                                                                                                <div className="md:col-span-2">
                                                                                                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                                                                                                        سبب التأجيل
                                                                                                    </label>
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        value={hearingDraft.notes}
                                                                                                        onChange={(e) => setHearingDraft((s) => ({ ...s, notes: e.target.value }))}
                                                                                                        disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                        className={URGENT_DOSSIER_INPUT}
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
                                                                                            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                                                                                                موعد الجلسة القادمة <span className="text-red-400">*</span>
                                                                                            </label>
                                                                                            <DatePickerField
                                                                                                value={hearingDraft.nextSessionDate || ''}
                                                                                                min={hearingDraft.sessionDate || undefined}
                                                                                                onValueChange={(v) => setHearingDraft((s) => ({ ...s, nextSessionDate: v }))}
                                                                                                disabled={isFinalized || grievanceWizardInputsLocked}
                                                                                                inputClassName={URGENT_DOSSIER_INPUT}
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
                                                                                            className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[44px] py-2 text-xs`}
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
                                                                                            className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[44px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
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
