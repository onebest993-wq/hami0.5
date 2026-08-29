import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { FileText } from '@/app/components/ui/icons/FileText';
import { ecg } from './executionCreationGlassUi';

interface SelectOption {
    value: string;
    label: string;
}

export interface InstrumentTypeIdentityFieldsProps {
    docType: string;
    docNumber: string;
    onDocNumberChange: (v: string) => void;
    currentDocTypeLabel: string;
    onOpenDocTypeSheet: () => void;

    visibleClassificationOptions: SelectOption[];
    classification: string;
    onClassificationChange: (v: string) => void;

    claimTypeOptionsList: SelectOption[];
    currentClaimTypeLabel: string;
    onOpenClaimTypeSheet: () => void;
    effectiveClaimTypes: string[];
    onRemoveActiveClaimType: (value: string) => void;
    claimType: string;

    chequeNumber: string;
    onChequeNumberChange: (v: string) => void;

    shariaDeedNumber: string;
    onShariaDeedNumberChange: (v: string) => void;
    shariaRegisterNumber: string;
    onShariaRegisterNumberChange: (v: string) => void;
    shariaIssueDate: string;
    onShariaIssueDateChange: (v: string) => void;
    shariaIssuingCourt: string;
    onShariaIssuingCourtChange: (v: string) => void;

    judgmentDate?: string;
    onJudgmentDateChange?: (v: string) => void;
}

/**
 * هوية السند: نوع السند / رقم الحكم / التصنيف / نوع المطالبة / أرقام الصك والحجة.
 */
export const InstrumentTypeIdentityFields: React.FC<InstrumentTypeIdentityFieldsProps> = ({
    docType,
    docNumber,
    onDocNumberChange,
    currentDocTypeLabel,
    onOpenDocTypeSheet,
    visibleClassificationOptions,
    classification,
    onClassificationChange,
    claimTypeOptionsList,
    currentClaimTypeLabel,
    onOpenClaimTypeSheet,
    effectiveClaimTypes,
    onRemoveActiveClaimType,
    claimType,
    chequeNumber,
    onChequeNumberChange,
    shariaDeedNumber,
    onShariaDeedNumberChange,
    shariaRegisterNumber,
    onShariaRegisterNumberChange,
    shariaIssueDate,
    onShariaIssueDateChange,
    shariaIssuingCourt,
    onShariaIssuingCourtChange,
    judgmentDate = '',
    onJudgmentDateChange,
}) => {
    const claimPickerLocked = (!docType && !classification) || docType === 'الأوراق التجارية';
    const claimPickerEmpty = !claimPickerLocked && claimTypeOptionsList.length === 0;
    const claimButtonLabel = claimPickerLocked
        ? ((!docType && !classification) ? '-- اختر نوع السند أولاً --' : currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --')
        : claimPickerEmpty
            ? '-- اختر التصنيف أولاً (إن وُجد) --'
            : (currentClaimTypeLabel || '-- اختر نوع المطالبة والتنفيذ --');

    return (
        <>
            {/* ✅ تصحيح 1: تغيير الاسم من "نوع السند" إلى "قرارات المحاكم" عند اختيار أحكام المحاكم */}
            <div>
                <label className={ecg.labelGold}>نوع السند المنفذ</label>
                <button
                    type="button"
                    onClick={onOpenDocTypeSheet}
                    className={ecg.pickerBtn}
                >
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate font-medium">
                        {currentDocTypeLabel || '-- اختر نوع السند المنفذ --'}
                    </span>
                </button>
            </div>

            {docType === 'قرارات وأحكام المحاكم' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <label className={ecg.labelGold}>رقم الحكم</label>
                        <input
                            type="text"
                            aria-label="رقم الحكم"
                            value={docNumber}
                            onChange={(e) => onDocNumberChange(e.target.value)}
                            className={ecg.field}
                        />
                    </div>
                    <div>
                        <label className={ecg.labelGold} htmlFor="execution-creation-judgment-date">
                            تاريخ الحكم
                        </label>
                        <input
                            id="execution-creation-judgment-date"
                            type="date"
                            aria-label="تاريخ الحكم"
                            data-testid="execution-creation-judgment-date"
                            value={judgmentDate}
                            onChange={(e) => onJudgmentDateChange?.(e.target.value)}
                            style={{ direction: 'ltr', textAlign: 'right' }}
                            className={`${ecg.field} text-sm`}
                        />
                    </div>
                </div>
            )}

            {/* 2. CLASSIFICATION DROPDOWN (التصنيف) - PHASE 31: HIDE for Sharia Deeds */}
            {docType !== 'الحجج الشرعية' && visibleClassificationOptions.length > 0 && (
                <div>
                    <label className={ecg.labelGold}>التصنيف</label>
                    {!docType ? (
                        <div className="rounded-[1.2rem] border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-medium text-slate-500">
                            -- اختر نوع السند أولاً --
                        </div>
                    ) : (
                        <div className={ecg.choiceRow} role="group" aria-label="التصنيف">
                            {visibleClassificationOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => onClassificationChange(opt.value)}
                                    className={`${ecg.choiceBtn} ${
                                        classification === opt.value
                                            ? ecg.choiceBtnActive
                                            : ecg.choiceBtnIdle
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* 3. CLAIM TYPE DROPDOWN (نوع المطالبة والتنفيذ) - PHASE 28: Unified */}
            <div>
                <label className={`${ecg.labelGold} flex items-center gap-2 flex-wrap`}>
                    نوع المطالبة والتنفيذ
                    {/* ✅ CRITICAL LOGIC: Auto-filled & Locked for Commercial Papers */}
                    {docType === 'الأوراق التجارية' && (
                        <span className="text-xs text-[#E6C673]/80 font-normal">(تلقائي - الصكوك دائماً مطالبات مالية)</span>
                    )}
                </label>
                <button
                    type="button"
                    disabled={claimPickerLocked || claimPickerEmpty}
                    onClick={() => {
                        if (!claimPickerLocked && !claimPickerEmpty) {
                            onOpenClaimTypeSheet();
                        }
                    }}
                    className={`${ecg.pickerBtn} ${
                        claimPickerLocked || claimPickerEmpty ? ecg.pickerBtnDisabled : ''
                    }`}
                >
                    <ChevronDown size={18} className="text-gray-400 shrink-0" />
                    <span className="flex-1 truncate font-medium">{claimButtonLabel}</span>
                </button>
                {effectiveClaimTypes.length > 1 ? (
                    <div className="mt-2.5 flex flex-wrap gap-2 justify-end">
                        {effectiveClaimTypes.map((ct) => (
                            <button
                                key={ct}
                                type="button"
                                onClick={() => onRemoveActiveClaimType(ct)}
                                className={ecg.chip}
                                title="إزالة من المطالبة المجمّعة"
                            >
                                {claimTypeOptionsList.find((o) => o.value === ct)?.label ?? ct} ×
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* ✅ حقل رقم السند تم نقله للأعلى في قسم "رقم الحكم" للأحكام القضائية */}
            {/* يظهر فقط لغير الأحكام القضائية والحجج الشرعية */}
            {/* ✅ CRITICAL LOGIC: Dynamic Labels for Commercial Papers */}
            {docType !== 'الحجج الشرعية' && docType !== 'قرارات وأحكام المحاكم' && docType && (
                <div>
                    {docType === 'الأوراق التجارية' && (
                        <label className={ecg.labelGold}>رقم الصك / الكمبيالة</label>
                    )}
                    <input
                        type="text"
                        aria-label={docType === 'الأوراق التجارية' ? 'رقم الصك / الكمبيالة' : 'رقم السند'}
                        value={docType === 'الأوراق التجارية' ? chequeNumber : docNumber}
                        onChange={(e) => {
                            if (docType === 'الأوراق التجارية') {
                                onChequeNumberChange(e.target.value);
                            } else {
                                onDocNumberChange(e.target.value);
                            }
                        }}
                        className={ecg.field}
                        disabled={docType === 'الأوراق التجارية'}
                        title={docType === 'الأوراق التجارية' ? 'تم إدخال هذا الرقم في مدقق الصك' : ''}
                    />
                    {docType === 'الأوراق التجارية' && chequeNumber && (
                        <p className="text-xs text-gray-500 mt-1">✓ تم التحقق من البيانات</p>
                    )}
                </div>
            )}

            {/* PHASE 49: SHARIA DEED IDENTIFICATION FIELDS */}
            {docType === 'الحجج الشرعية' && (
                <div className={`${ecg.subCard} animate-fade-in`}>
                    <h4 className={`${ecg.subCardTitle} text-[#E6C673] border-b border-white/8 pb-2 mb-3 flex items-center gap-2`}>
                        <FileText size={16} />
                        بيانات الحجة الشرعية
                    </h4>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                            <label className={ecg.labelGold}>العدد / رقم الحجة</label>
                            <input
                                type="text"
                                aria-label="العدد / رقم الحجة"
                                value={shariaDeedNumber}
                                onChange={(e) => onShariaDeedNumberChange(e.target.value)}
                                className={`${ecg.field} text-sm`}
                            />
                        </div>
                        <div>
                            <label className={ecg.labelGold}>رقم السجل</label>
                            <input
                                type="text"
                                aria-label="رقم السجل"
                                value={shariaRegisterNumber}
                                onChange={(e) => onShariaRegisterNumberChange(e.target.value)}
                                className={`${ecg.field} text-sm`}
                            />
                        </div>
                        <div>
                            <label className={ecg.labelGold}>تاريخ الإصدار</label>
                            <input
                                type="date"
                                value={shariaIssueDate}
                                onChange={(e) => onShariaIssueDateChange(e.target.value)}
                                style={{ direction: 'ltr', textAlign: 'right' }}
                                className={`${ecg.field} text-sm`}
                            />
                        </div>
                    </div>
                    {!['مهر مؤجل', 'حجة زواج - مهر معجل', 'حجة زواج - مهر مؤجل'].includes(claimType) && (
                        <div className="mt-3">
                            <label className={ecg.labelGold}>المحكمة الشرعية المصدرة</label>
                            <input
                                type="text"
                                aria-label="المحكمة الشرعية المصدرة"
                                value={shariaIssuingCourt}
                                onChange={(e) => onShariaIssuingCourtChange(e.target.value)}
                                className={`${ecg.field} text-sm`}
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};
