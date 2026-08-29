import React from 'react';
import { AlertTriangle } from '@/app/components/ui/icons/AlertTriangle';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { ecg } from './executionCreationGlassUi';
import type { AbsenteeChecks } from '../types';

interface ExecutionIntakeModalsProps {
    showChequeValidatorModal: boolean;
    chequeBankName: string;
    chequeIssueDate: string;
    chequeNumber: string;
    onChequeBankNameChange: (v: string) => void;
    onChequeIssueDateChange: (v: string) => void;
    onChequeNumberChange: (v: string) => void;
    onChequeValidatorClose: () => void;
    onDocTypeChange: (v: string) => void;
    onClaimTypeChange: (v: string) => void;

    showAbsenteeModal: boolean;
    absenteeChecks: AbsenteeChecks;
    onAbsenteeChecksChange: (checks: AbsenteeChecks) => void;
    onAbsenteeModalClose: () => void;
    onDocumentBlockedChange: (blocked: boolean) => void;
}

const ABSENTEE_QUESTIONS: Array<{ key: keyof AbsenteeChecks; label: string }> = [
    { key: 'isOutsideIraq', label: 'هل المدين متواجد خارج العراق؟' },
    { key: 'isAddressUnknown', label: 'هل محل إقامة المدين مجهول؟' },
    { key: 'isDiedDuringNotice', label: 'هل توفي المدين خلال فترة الإخبار؟' },
];

/**
 * مودالات استقبال السند: مدقق الصك التجاري + فحص الغياب الإلزامي —
 * مستخرجة من ExecutionCreationView لتقليص حجم المكوّن الرئيسي (Phase-1 split).
 */
export const ExecutionIntakeModals: React.FC<ExecutionIntakeModalsProps> = ({
    showChequeValidatorModal,
    chequeBankName,
    chequeIssueDate,
    chequeNumber,
    onChequeBankNameChange,
    onChequeIssueDateChange,
    onChequeNumberChange,
    onChequeValidatorClose,
    onDocTypeChange,
    onClaimTypeChange,
    showAbsenteeModal,
    absenteeChecks,
    onAbsenteeChecksChange,
    onAbsenteeModalClose,
    onDocumentBlockedChange,
}) => (
    <>
        {/* ✅ PRACTICAL CHEQUE VALIDATOR - DATA CAPTURE MODAL */}
        {showChequeValidatorModal && (
            <div
                className={ecg.modalBackdrop}
                onClick={() => {
                    if (!chequeBankName && !chequeIssueDate && !chequeNumber) {
                        onChequeValidatorClose();
                    }
                }}
            >
                <div className={ecg.modalPanel} onClick={(e) => e.stopPropagation()}>
                    <h3 className={ecg.modalTitle}>
                        <AlertTriangle size={24} />
                        بيانات الورقة التجارية (صك/كمبيالة)
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        📋 هذه البيانات ستُستخدم في طلب التنفيذ ومخاطبة المصرف
                    </p>

                    <div className="space-y-4 mb-6">
                        {/* Bank Name */}
                        <div>
                            <label className={ecg.labelGold}>اسم المصرف المسحوب عليه *</label>
                            <input
                                type="text"
                                value={chequeBankName}
                                onChange={(e) => onChequeBankNameChange(e.target.value)}
                                placeholder="مثال: مصرف الرافدين، المصرف الأهلي العراقي..."
                                className={ecg.field}
                            />
                        </div>
                        <div>
                            <label className={ecg.labelGold}>رقم الصك / الكمبيالة *</label>
                            <input
                                type="text"
                                value={chequeNumber}
                                onChange={(e) => onChequeNumberChange(e.target.value)}
                                placeholder="مثال: 12345678"
                                className={ecg.field}
                            />
                        </div>
                        <div>
                            <label className={`${ecg.labelGold} flex items-center gap-2 flex-wrap`}>
                                <Calendar size={16} />
                                تاريخ إنشاء الصك
                                <span className="text-slate-500 text-xs font-normal">(اختياري لكن مهم قانونياً)</span>
                            </label>
                            <input
                                type="date"
                                value={chequeIssueDate}
                                onChange={(e) => onChequeIssueDateChange(e.target.value)}
                                className={ecg.field}
                            />
                            {!chequeIssueDate && (
                                <p className="text-rose-400 text-xs mt-2 flex items-center gap-1">
                                    <AlertTriangle size={12} />
                                    ⚠️ تحذير: الصك بدون تاريخ قد يفقد قوته التنفيذية ويتحول لسند عادي
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button"
                            onClick={() => {
                                // Validation Rule: If no issue date, downgrade document power
                                if (!chequeIssueDate) {
                                    onDocTypeChange('السندات المتضمنة إقراراً بدين');
                                    onClaimTypeChange('استحصال دين مالي');
                                    SmartToast.warning('⚠️ تنبيه قانوني: لعدم وجود تاريخ إنشاء، تحول الصك إلى سند عادي. يجب إثبات الدين وفق شروط مشددة.');
                                }
                                onChequeValidatorClose();
                            }}
                            disabled={!chequeBankName || !chequeNumber}
                            className={ecg.modalBtnPrimary}
                        >
                            {chequeIssueDate ? 'تأكيد البيانات' : 'متابعة كسند عادي'}
                        </button>
                        <button type="button"
                            onClick={() => {
                                onChequeValidatorClose();
                                onDocTypeChange('');
                                onClaimTypeChange('');
                            }}
                            className={ecg.modalBtnGhost}
                        >
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* 🛑 ABSENTEE CHECKLIST MODAL */}
        {showAbsenteeModal && (
            <div className={ecg.modalBackdrop} onClick={onAbsenteeModalClose}>
                <div className={ecg.modalPanelDanger} onClick={(e) => e.stopPropagation()}>
                    <h3 className={`${ecg.calloutDangerTitle} mb-4`}>
                        <AlertTriangle size={24} />
                        فحص الغياب الإلزامي
                    </h3>
                    <p className="text-slate-400 text-sm mb-4">
                        يرجى الإجابة على الأسئلة التالية:
                    </p>
                    <div className="space-y-3 mb-6">
                        {ABSENTEE_QUESTIONS.map((item) => (
                            <label key={item.key} className={ecg.optionRow}>
                                <span className="text-white text-sm flex-1">{item.label}</span>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={item.key}
                                            checked={absenteeChecks[item.key] === true}
                                            onChange={() =>
                                                onAbsenteeChecksChange({ ...absenteeChecks, [item.key]: true })
                                            }
                                            className="accent-rose-500"
                                        />
                                        <span className="text-xs text-gray-400">نعم</span>
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                            type="radio"
                                            name={item.key}
                                            checked={absenteeChecks[item.key] === false}
                                            onChange={() =>
                                                onAbsenteeChecksChange({ ...absenteeChecks, [item.key]: false })
                                            }
                                            className="accent-emerald-500"
                                        />
                                        <span className="text-xs text-gray-400">لا</span>
                                    </label>
                                </div>
                            </label>
                        ))}
                    </div>
                    <button type="button"
                        onClick={() => {
                            const hasAnyYes = Object.values(absenteeChecks).some((v) => v === true);
                            if (hasAnyYes) {
                                onDocumentBlockedChange(true);
                                SmartToast.error('🛑 توقف: استناداً للفقرة رابعاً من المادة 14، فقدَ هذا السند قوته التنفيذية المباشرة.');
                            } else {
                                onDocumentBlockedChange(false);
                            }
                            onAbsenteeModalClose();
                        }}
                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg transition-all"
                    >
                        تأكيد
                    </button>
                </div>
            </div>
        )}
    </>
);
