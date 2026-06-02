import React from 'react';
import { Calendar, Plus } from 'lucide-react';
import { DatePickerField } from '../../components/DatePickerField';
import {
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../../utils/hearingRules';
import { PRE_DECISION_OUTCOME_NULLIFY } from '../../constants/hearingOutcomes';
import { formatDateText } from '../../utils/formatters';
import type { JudgeDecisionLifecyclePanelProps } from '../JudgeDecisionLifecyclePanelProps';

export function JudgePreDecisionHearingsPanel(props: JudgeDecisionLifecyclePanelProps) {
    const {
        addHearing,
        intakeFirstHearingDate,
        isAdjourned,
        isCaseTerminated,
        isFinalized,
        hearingDraft,
        hearingDraftAdjournReasonError,
        hearingDraftNextSessionDateError,
        hearingDraftSessionDateError,
        hasSessions,
        phase1ActiveDate,
        phase1NewSessionMinYmd,
        phase1Sessions,
        preDecisionHearingsSorted,
        preDecisionTerminalKind,
        setHearingDraft,
        showPreDecisionHearings,
    } = props;

    if (!showPreDecisionHearings) return null;

    return (
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
    );
}
