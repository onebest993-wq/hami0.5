import React from 'react';
import { DatePickerField } from '../../components/DatePickerField';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

export function GrievanceFiledDecisionSection(props: GrievanceLifecyclePanelProps) {
    const {
        grievanceDecision,
        grievanceDecisionDateChronologyError,
        grievanceDecisionMinYmd,
        grievanceFinalGateRef,
        grievanceWizardInputsLocked,
        setGrievanceDecision,
        showGrievanceDecisionForm,
    } = props;

    if (!showGrievanceDecisionForm) return null;

    return (
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
    );
}
