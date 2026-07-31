import React from 'react';
import { DatePickerField } from '../../components/DatePickerField';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import {
    URGENT_DOSSIER_INPUT,
    URGENT_DOSSIER_PILL_BASE,
    URGENT_DOSSIER_PILL_IDLE,
} from '../../layout/urgentDossierUi';

const DECISION_OPTIONS: Array<{
    value: 'confirmed' | 'canceled' | 'modified';
    label: string;
    active: string;
}> = [
    { value: 'confirmed', label: 'تأييد الأمر الولائي', active: 'border-emerald-500/45 bg-emerald-500/15 text-emerald-100' },
    { value: 'canceled', label: 'إلغاء الأمر الولائي', active: 'border-rose-500/45 bg-rose-500/15 text-rose-100' },
    { value: 'modified', label: 'تعديل الأمر الولائي', active: 'border-amber-500/45 bg-amber-500/15 text-amber-100' },
];

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
        <div ref={grievanceFinalGateRef} className="mt-5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 space-y-3">
            <div className="text-xs font-bold text-white/80">قرار قاضي التظلم (نهاية المرحلة)</div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DECISION_OPTIONS.map((opt) => {
                    const selected = grievanceDecision.decision === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            disabled={grievanceWizardInputsLocked}
                            onClick={() => setGrievanceDecision({ ...grievanceDecision, decision: opt.value })}
                            className={`${URGENT_DOSSIER_PILL_BASE} ${
                                selected ? opt.active : URGENT_DOSSIER_PILL_IDLE
                            }`}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-wide mb-1">
                    تاريخ صدور قرار التظلم <span className="text-red-400">*</span>
                </label>
                <DatePickerField
                    value={grievanceDecision.decisionDate || ''}
                    onValueChange={(v) => setGrievanceDecision({ ...grievanceDecision, decisionDate: v })}
                    min={grievanceDecisionMinYmd || undefined}
                    disabled={grievanceWizardInputsLocked || !grievanceDecision.decision}
                    inputClassName={URGENT_DOSSIER_INPUT}
                />
                {!!grievanceDecisionDateChronologyError && (
                    <div className="mt-1 text-red-200 text-[11px] font-bold">{grievanceDecisionDateChronologyError}</div>
                )}
            </div>
        </div>
    );
}
