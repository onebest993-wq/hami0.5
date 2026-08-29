import React from 'react';
import { ecg } from './executionCreationGlassUi';
import { ForeignJudgmentSection, type ForeignJudgmentData } from './ForeignJudgmentSection';

export interface InstrumentShariaForeignExtrasProps {
    docType: string;
    claimType: string;
    dowryReason: 'طلاق' | 'وفاة';
    onDowryReasonChange: (v: 'طلاق' | 'وفاة') => void;
    guardianshipDetails: string;
    onGuardianshipDetailsChange: (v: string) => void;
    foreignData: ForeignJudgmentData;
    onForeignDataChange: (data: ForeignJudgmentData) => void;
}

/**
 * متغيّرات الحجج الشرعية (مهر / وصية / تخارج) + الأحكام الأجنبية.
 */
export const InstrumentShariaForeignExtras: React.FC<InstrumentShariaForeignExtrasProps> = ({
    docType,
    claimType,
    dowryReason,
    onDowryReasonChange,
    guardianshipDetails,
    onGuardianshipDetailsChange,
    foreignData,
    onForeignDataChange,
}) => {
    return (
        <>
            {/* === PHASE 31: SHARIA DEED DYNAMIC INPUTS === */}

            {/* VARIANT A: DEFERRED DOWRY (مهر مؤجل) */}
            {docType === 'الحجج الشرعية' && claimType === 'مهر مؤجل' && (
                <div className="space-y-3">
                    {/* Amount already shown above in STATE A */}

                    {/* Dowry Reason Radio */}
                    <div className={ecg.subCard}>
                        <label className={ecg.labelGold}>سبب الاستحقاق:</label>
                        <div className={`${ecg.choiceRow} !gap-3`}>
                            <label className={`${ecg.radioRow} ${dowryReason === 'طلاق' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                <input
                                    type="radio"
                                    name="dowryReason"
                                    value="طلاق"
                                    checked={dowryReason === 'طلاق'}
                                    onChange={(e) => onDowryReasonChange(e.target.value as 'طلاق' | 'وفاة')}
                                    className="accent-[#E6C673]"
                                />
                                <span className="text-white text-sm">الطلاق</span>
                            </label>
                            <label className={`${ecg.radioRow} ${dowryReason === 'وفاة' ? ecg.radioRowActive : ecg.radioRowIdle} flex-1`}>
                                <input
                                    type="radio"
                                    name="dowryReason"
                                    value="وفاة"
                                    checked={dowryReason === 'وفاة'}
                                    onChange={(e) => onDowryReasonChange(e.target.value as 'طلاق' | 'وفاة')}
                                    className="accent-[#E6C673]"
                                />
                                <span className="text-white text-sm">الوفاة</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* VARIANT C: WILL & TAKHARUJ DEEDS - PHASE 42 */}
            {docType === 'الحجج الشرعية' && (claimType === 'حجة وصية' || claimType === 'حجة تخارج') && (
                <div className={ecg.subCard}>
                    <label className={ecg.labelGold}>
                        تفاصيل الحجة (مثال: اسم الموصى له، أو تفاصيل حصص التخارج)
                    </label>
                    <textarea
                        value={guardianshipDetails}
                        onChange={(e) => onGuardianshipDetailsChange(e.target.value)}
                        className={ecg.textarea}
                        rows={4}
                        placeholder={claimType === 'حجة وصية'
                            ? "مثال: الموصى له: محمد علي، الحصة الموصى بها: ربع التركة..."
                            : "مثال: تفاصيل حصص الورثة المتخارجين والمبالغ المتفق عليها..."
                        }
                    />
                </div>
            )}

            {docType === 'تنفيذ الأحكام الأجنبية' && (
                <ForeignJudgmentSection
                    foreignData={foreignData}
                    onForeignDataChange={onForeignDataChange}
                />
            )}
        </>
    );
};
