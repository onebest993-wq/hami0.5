import React from 'react';
import { HamiDateInput } from '@/app/components/ui/HamiDateInput';
import { ProcedureCategoryActionPicker } from './ProcedureCategoryActionPicker';
import { PETITION_ORDER_MANUAL_OPTION } from './constants';
import { fieldInputClass } from './formFieldClasses';
import type { UrgentActionFormData } from './urgentActionsFormTypes';

type Props = {
    formData: UrgentActionFormData;
    validationErrors: Record<string, string>;
    selectedSubActionType: string;
    setSelectedSubActionType: (next: string) => void;
    customSpecificActionType: string;
    setCustomSpecificActionType: (next: string) => void;
    isIqrarContext: boolean;
    updateField: <K extends keyof UrgentActionFormData>(field: K, value: UrgentActionFormData[K]) => void;
};

export function UrgentActionsBasicInfoSection({
    formData,
    validationErrors,
    selectedSubActionType,
    setSelectedSubActionType,
    customSpecificActionType,
    setCustomSpecificActionType,
    isIqrarContext,
    updateField,
}: Props) {
    return (
        <div className="bg-[#0B1021] border border-white/10 rounded-lg p-3">
            <h2 className="text-white font-bold text-sm mb-2">معلومات الطلب الأساسية</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-white/70 text-sm mb-2">
                        اسم المحكمة <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={formData.courtName}
                        onChange={(e) => updateField('courtName', e.target.value)}
                        className={fieldInputClass}
                    />
                    {validationErrors.courtName && (
                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.courtName}</div>
                    )}
                </div>
                <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-white/70 text-sm mb-2">
                        نوع الطلب / الإجراء <span className="text-red-400">*</span>
                    </label>
                    <ProcedureCategoryActionPicker
                        value={selectedSubActionType}
                        onChange={(next) => {
                            setSelectedSubActionType(next);
                            if (next === 'other' || next === PETITION_ORDER_MANUAL_OPTION) {
                                setCustomSpecificActionType('');
                                updateField('specificActionType', '');
                                return;
                            }
                            updateField('specificActionType', next);
                        }}
                    />
                    {validationErrors.specificActionType && (
                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.specificActionType}</div>
                    )}
                    {(selectedSubActionType === 'other' || selectedSubActionType === PETITION_ORDER_MANUAL_OPTION) && (
                        <div className="mt-3">
                            <label className="block text-white/70 text-sm mb-2">
                                {selectedSubActionType === PETITION_ORDER_MANUAL_OPTION
                                    ? 'تحديد الأمر الولائي يدوياً'
                                    : 'تحديد نوع الإجراء يدوياً'}{' '}
                                <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={customSpecificActionType}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setCustomSpecificActionType(val);
                                    updateField('specificActionType', val);
                                }}
                                className={fieldInputClass}
                            />
                            {validationErrors.customSpecificActionType && (
                                <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.customSpecificActionType}</div>
                            )}
                        </div>
                    )}

                    {isIqrarContext ? (
                        <div className="mt-4">
                            <label className="block text-white/70 text-sm mb-2">
                                موضوع الإقرار وقيمة الحق <span className="text-red-400">*</span>
                            </label>
                            <textarea
                                value={formData.requestSubject}
                                onChange={(e) => updateField('requestSubject', e.target.value)}
                                className={`${fieldInputClass} resize-y min-h-[96px]`}
                            />
                            {validationErrors.requestSubject && (
                                <div className="text-red-300 text-xs mt-2 font-bold">
                                    {validationErrors.requestSubject}
                                </div>
                            )}
                            <p className="mt-2 text-white/45 text-xs leading-relaxed">
                                الإقرار حجة طوعية — لا يُطبَّق عليه مسار التظلم (3 أيام) أو التمييز (7 أيام).
                            </p>
                        </div>
                    ) : null}
                </div>

                {!isIqrarContext ? (
                    <div className="md:col-span-2">
                        <label className="block text-white/70 text-sm mb-2">رقم الطلب</label>
                        <input
                            type="text"
                            value={formData.requestNumber}
                            onChange={(e) => updateField('requestNumber', e.target.value)}
                            className={fieldInputClass}
                        />
                    </div>
                ) : null}
                <div>
                    <label className="block text-white/70 text-sm mb-2">
                        {isIqrarContext ? (
                            <>
                                موعد الحضور للمصادقة <span className="text-red-400">*</span>
                            </>
                        ) : (
                            <>تاريخ تقديم الطلب / المراجعة</>
                        )}
                    </label>
                    <HamiDateInput
                        value={formData.requestDate}
                        onValueChange={(v) => updateField('requestDate', v)}
                        className={fieldInputClass}
                    />
                    {validationErrors.requestDate && (
                        <div className="text-red-300 text-xs mt-2 font-bold">{validationErrors.requestDate}</div>
                    )}
                </div>
                {!isIqrarContext ? (
                    <div>
                        <label className="block text-white/70 text-sm mb-2">تاريخ أول مرافعة</label>
                        <HamiDateInput
                            value={formData.firstHearingDate ?? ''}
                            onValueChange={(v) => updateField('firstHearingDate', v)}
                            className={fieldInputClass}
                        />
                    </div>
                ) : null}
                {!isIqrarContext ? (
                    <div>
                        <label className="block text-white/70 text-sm mb-2">اسم القاضي</label>
                        <input
                            type="text"
                            value={formData.judgeName}
                            onChange={(e) => updateField('judgeName', e.target.value)}
                            className={fieldInputClass}
                        />
                    </div>
                ) : null}
            </div>
        </div>
    );
}
