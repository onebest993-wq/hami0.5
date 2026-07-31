import React from 'react';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';
import { URGENT_DOSSIER_BTN_GHOST, URGENT_DOSSIER_BTN_PRIMARY } from '../../layout/urgentDossierUi';

export function GrievanceTimingSection(props: GrievanceLifecyclePanelProps) {
    const {
        confirmGrievanceTiming,
        grievanceData,
        grievanceDecisionNotificationConfirmed,
        grievanceLegalEndDate,
        grievanceTimingGateReady,
        grievanceWizardInputsLocked,
        hasIntervention,
        setDecisionNotificationModalOpen,
        showGrievanceTimingForm,
    } = props;

    if (!showGrievanceTimingForm) return null;

    return (
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-3 space-y-3">
            <div className="text-xs font-bold text-white/80">التبليغ ومدة التظلم</div>

            {!hasIntervention && (
                <div className="rounded-lg border border-white/[0.08] bg-[#0A0F1C]/40 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="text-white/70 text-xs font-semibold">تاريخ التبليغ بقرار القاضي</div>
                        <button
                            type="button"
                            onClick={() => setDecisionNotificationModalOpen(true)}
                            disabled={grievanceWizardInputsLocked}
                            className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[36px] py-1.5 px-3 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {grievanceDecisionNotificationConfirmed ? 'تعديل التبليغ' : 'تأكيد التبليغ'}
                        </button>
                    </div>
                    <div className="mt-1.5 text-white/60 text-xs">
                        {grievanceData.rejectionNotificationDate
                            ? `التاريخ المعتمد: ${formatDateText(grievanceData.rejectionNotificationDate)}`
                            : 'لم يُحدَّد بعد'}
                    </div>
                </div>
            )}

            {!!grievanceLegalEndDate && (
                <div className="text-white/60 text-xs">
                    انتهاء مدة التظلم:{' '}
                    <span className="text-white font-bold">{formatDateText(grievanceLegalEndDate)}</span>
                </div>
            )}

            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={() => void confirmGrievanceTiming()}
                    disabled={grievanceWizardInputsLocked || !grievanceTimingGateReady}
                    className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    تثبيت التوقيت القانوني
                </button>
            </div>
        </div>
    );
}
