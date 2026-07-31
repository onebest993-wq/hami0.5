import React from 'react';
import { DatePickerField } from '../../components/DatePickerField';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import { URGENT_DOSSIER_BTN_PRIMARY } from '../../layout/urgentDossierUi';

export function GrievanceFiledDetailsSection(props: GrievanceLifecyclePanelProps) {
    const {
        computedGrievanceFiledBy,
        confirmGrievanceDetails,
        grievanceData,
        grievanceFilingDateChronologyError,
        grievanceFilingMinYmd,
        grievanceFirstHearingDateChronologyError,
        grievanceFirstHearingMinYmd,
        grievanceTimingConfirmed,
        grievanceWizardInputsLocked,
        partyLabel,
        phase2FirstHearingDate,
        setGrievanceData,
        showGrievanceDetailsForm,
        updatePhase2FirstHearingDate,
    } = props;

    if (!showGrievanceDetailsForm) return null;

    return (
                                                                <div className="border border-white/10 bg-white/5 rounded-xl p-4 space-y-4">
                                                                    <div className="text-white font-extrabold text-sm">بيانات التظلم</div>
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
                                                                            className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                                                                        >
                                                                            تثبيت بيانات التظلم
                                                                        </button>
                                                                    </div>
                                                                </div>
    );
}
