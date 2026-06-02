import React from 'react';
import { formatDateText } from '../../utils/formatters';
import type { GrievanceLifecyclePanelProps } from '../GrievanceLifecyclePanelProps';

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
                                                        {!!grievanceLegalEndDate && (
                                                            <div className="text-white/70 text-sm">
                                                                انتهاء مدة التظلم (3 أيام):{' '}
                                                                <span className="text-white font-bold">
                                                                    {formatDateText(grievanceLegalEndDate)}
                                                                </span>
                                                            </div>
                                                        )}
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
                                                                    ? 'يُحتسب تاريخ انتهاء المدة تلقائياً بعد تثبيت التبليغ.'
                                                                    : 'أكّد تاريخ التبليغ بقرار القاضي لتفعيل احتساب مدة التظلم (3 أيام).'}
                                                            </div>
                                                        ) : null}
                                                    </div>
    );
}
