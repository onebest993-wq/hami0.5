import * as React from 'react';
import { createPortal } from 'react-dom';
import { X, FileText } from '@/app/components/ui/lucideIcons';
import { motion } from 'motion/react';

interface CoerciveActionFormModalProps {
    showCoerciveActionForm: string | null; // null | 'salary' | 'property' | 'travel' | 'imprisonment' | 'vehicle'
    setShowCoerciveActionForm: (form: string | null) => void;
    seizureDetailCompletion: {
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null;
    setSeizureDetailCompletion: (completion: {
        decisionRowId: string;
        assetId: string;
        actionType: 'salary' | 'property' | 'vehicle';
    } | null) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    activeDebtorIsDeceased: boolean;
    executionData?: {
        garnishmentAmount?: number;
    };
    showToast: (message: string, type: 'warning' | 'success' | 'error' | 'info') => void;
    EXEC_MODAL_Z: { nestedOverUnified: number };
    EXEC_MODAL_BACKDROP_STRONG: string;
}

export const CoerciveActionFormModal: React.FC<CoerciveActionFormModalProps> = ({
    showCoerciveActionForm,
    setShowCoerciveActionForm,
    seizureDetailCompletion,
    setSeizureDetailCompletion,
    saveCoerciveAction,
    activeDebtorIsDeceased,
    executionData,
    showToast,
    EXEC_MODAL_Z,
    EXEC_MODAL_BACKDROP_STRONG,
}) => {
    if (!showCoerciveActionForm || typeof document === 'undefined') {
        return null;
    }

    return (
        typeof document !== 'undefined' ? createPortal(
            <div
                className={`fixed inset-0 flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_STRONG}`}
                style={{ zIndex: EXEC_MODAL_Z.nestedOverUnified }}
                role="presentation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowCoerciveActionForm(null);
                        setSeizureDetailCompletion(null);
                    }
                }}
            >
                        <div
                            className="bg-[#0B1120] border-2 border-amber-500/40 rounded-3xl w-full max-w-md shadow-2xl shadow-black/50"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="sticky top-0 bg-[#0B1120] border-b border-amber-500/30 p-4 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowCoerciveActionForm(null);
                                        setSeizureDetailCompletion(null);
                                    }}
                                    className="p-2 hover:bg-amber-500/20 rounded-lg transition-all"
                                    aria-label="إغلاق"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                                <h2 className="text-amber-400 font-bold text-lg">
                                    {seizureDetailCompletion ? (
                                        <>
                                            {showCoerciveActionForm === 'salary' &&
                                                (activeDebtorIsDeceased
                                                    ? '💼 إكمال بيانات حجز الحوافز (بعد موافقة المنفذ)'
                                                    : '💼 إكمال بيانات حجز الراتب (بعد موافقة المنفذ)')}
                                            {showCoerciveActionForm === 'property' &&
                                                '🏠 إكمال بيانات حجز العقار (بعد موافقة المنفذ)'}
                                            {showCoerciveActionForm === 'vehicle' &&
                                                '📦 إكمال بيانات حجز المال المنقول (بعد موافقة المنفذ)'}
                                        </>
                                    ) : (
                                        <>
                                            {showCoerciveActionForm === 'salary' &&
                                                (activeDebtorIsDeceased
                                                    ? '💼 طلب حجز الحوافز والمخصصات'
                                                    : '💼 طلب حجز راتب')}
                                            {showCoerciveActionForm === 'property' && '🏠 طلب حجز عقار'}
                                            {showCoerciveActionForm === 'vehicle' && '📦 طلب حجز مال منقول'}
                                        </>
                                    )}
                                    {showCoerciveActionForm === 'travel' && '✈️ منع سفر'}
                                    {showCoerciveActionForm === 'imprisonment' && '⛓️ طلب حبس'}
                                </h2>
                            </div>
                            
                            <div className="p-5 space-y-4">
                                {showCoerciveActionForm === 'salary' && (
                                    <>
                                        {executionData?.garnishmentAmount && (
                                            <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 text-right">
                                                <p className="text-amber-300 text-xs mb-2">💼 مقدار الحجز الشهري المحسوب:</p>
                                                <p className="text-amber-400 text-2xl font-black font-mono">
                                                    {Number(executionData.garnishmentAmount).toLocaleString('ar-IQ')} دينار
                                                </p>
                                                <p className="text-gray-400 text-[10px] mt-1">(1/5 من صافي الراتب)</p>
                                            </div>
                                        )}
                                        
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">
                                                {activeDebtorIsDeceased
                                                    ? 'جهة صرف الحوافز/المخصصات'
                                                    : 'جهة العمل'}
                                            </label>
                                            <input
                                                type="text"
                                                placeholder={
                                                    activeDebtorIsDeceased
                                                        ? 'الجهة الصارفة للحوافز والمخصصات'
                                                        : 'جهة العمل / دائرة المهندس المقيم'
                                                }
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="employerName"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">
                                                مقدار الدخل الشهري (إن وجد)
                                            </label>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                placeholder="مثال: 1,250,000"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="salaryAmountInput"
                                                onInput={(e) => {
                                                    const el = e.currentTarget;
                                                    el.value = el.value.replace(/[^\d]/g, '');
                                                }}
                                            />
                                        </div>
                                        
                                        {executionData?.garnishmentAmount && (
                                            <button type="button"
                                                onClick={() => {
                                                    showToast(
                                                        `🖨️ سيتم طباعة كتاب الحجز — مقدار الحجز: ${Number(executionData.garnishmentAmount).toLocaleString('ar-IQ')} دينار شهرياً`,
                                                        'info',
                                                    );
                                                }}
                                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                                            >
                                                <FileText size={18} />
                                                🖨️ طباعة كتاب الحجز لدائرة المهندس المقيم
                                            </button>
                                        )}
                                    </>
                                )}
                                
                                {showCoerciveActionForm === 'property' && (
                                    <>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">رقم العقار</label>
                                            <input
                                                type="text"
                                                placeholder="مثال: 1540"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="propertyNumber"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">المقاطعة</label>
                                            <input
                                                type="text"
                                                placeholder="مثال: 12/العطيفية"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="propertyDistrict"
                                                dir="rtl"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">نوع العقار</label>
                                            <input
                                                type="text"
                                                placeholder="مثال: دار / شقة / عرصة / بستان"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="propertyType"
                                                dir="rtl"
                                            />
                                        </div>
                                    </>
                                )}

                                {showCoerciveActionForm === 'vehicle' && (
                                    <>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">
                                                نوع/وصف المال المنقول
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="مثال: سيارة، أثاث، معدات…"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="movableDescription"
                                                dir="rtl"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">
                                                مكان تواجد المال المنقول
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="مثال: عنوان/مخزن/موقع وجود المال"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="movableLocation"
                                                dir="rtl"
                                            />
                                        </div>
                                        <div className="rounded-xl border border-white/10 bg-slate-900/35 p-3 space-y-2">
                                            <label className="block text-[10px] text-slate-400 text-right">
                                                اسم الحارس القضائي (إن وجد)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="اختياري"
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-white text-right"
                                                id="judicialCustodianName"
                                                dir="rtl"
                                            />
                                        </div>
                                    </>
                                )}
                                
                                {showCoerciveActionForm === 'travel' && (
                                    <div className="backdrop-blur-xl bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 text-right">
                                        <p className="text-purple-300 text-sm mb-2">سيتم إرسال طلب منع السفر إلى:</p>
                                        <ul className="text-gray-400 text-xs space-y-1">
                                            <li>• مديرية الجنسية والأحوال المدنية</li>
                                            <li>• جميع المنافذ الحدودية</li>
                                        </ul>
                                    </div>
                                )}
                                
                                {showCoerciveActionForm === 'imprisonment' && (
                                    <div className="backdrop-blur-xl bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 text-right">
                                        <p className="text-rose-300 text-sm mb-2">⚠️ تنبيه قانوني</p>
                                        <p className="text-gray-400 text-xs">
                                            الحبس الإكراهي يتطلب موافقة القاضي ويُطبق فقط بعد ثبوت إخلال المدين بالدفع رغم قدرته المالية.
                                        </p>
                                    </div>
                                )}
                                
                                <button
                                    type="button"
                                    onClick={() => {
                                        // ✅ FIXED: Proper type for details
                                        const details: Record<string, string> = {};
                                        if (showCoerciveActionForm === 'salary') {
                                            details.employerName = (document.getElementById('employerName') as HTMLInputElement)?.value || '';
                                            details.salaryAmount = (document.getElementById('salaryAmountInput') as HTMLInputElement)?.value || '';
                                            details.description = `${activeDebtorIsDeceased ? 'جهة صرف الحوافز/المخصصات' : 'جهة العمل'}: ${details.employerName}${details.salaryAmount ? `\nمقدار الدخل الشهري: ${details.salaryAmount}` : ''}`;
                                        } else if (showCoerciveActionForm === 'property') {
                                            details.propertyNumber = (document.getElementById('propertyNumber') as HTMLInputElement)?.value || '';
                                            details.propertyDistrict = (document.getElementById('propertyDistrict') as HTMLInputElement)?.value || '';
                                            details.propertyType = (document.getElementById('propertyType') as HTMLInputElement)?.value || '';
                                            if (!details.propertyNumber.trim()) {
                                                showToast('أدخل رقم العقار', 'warning');
                                                return;
                                            }
                                            if (!details.propertyDistrict.trim()) {
                                                showToast('أدخل المقاطعة', 'warning');
                                                return;
                                            }
                                            if (!details.propertyType.trim()) {
                                                showToast('أدخل نوع العقار', 'warning');
                                                return;
                                            }
                                            details.description = `رقم العقار: ${details.propertyNumber}\nالمقاطعة: ${details.propertyDistrict}\nالنوع: ${details.propertyType}`;
                                        } else if (showCoerciveActionForm === 'vehicle') {
                                            details.movableDescription =
                                                (document.getElementById('movableDescription') as HTMLInputElement)?.value || '';
                                            details.movableLocation =
                                                (document.getElementById('movableLocation') as HTMLInputElement)?.value || '';
                                            details.judicialCustodianName =
                                                (document.getElementById('judicialCustodianName') as HTMLInputElement)?.value || '';
                                            if (!details.movableDescription.trim()) {
                                                showToast('أدخل وصف المال المنقول', 'warning');
                                                return;
                                            }
                                            if (!details.movableLocation.trim()) {
                                                showToast('أدخل مكان تواجد المال المنقول', 'warning');
                                                return;
                                            }
                                            const cust = String(details.judicialCustodianName || '').trim();
                                            details.description = [
                                                `وصف المال المنقول: ${String(details.movableDescription || '').trim()}`,
                                                `المكان: ${String(details.movableLocation || '').trim()}`,
                                                cust ? `الحارس القضائي: ${cust}` : null,
                                            ]
                                                .filter(Boolean)
                                                .join('\n');
                                        }

                                        saveCoerciveAction(showCoerciveActionForm, details);
                                    }}
                                    className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-amber-500/30"
                                >
                                    {seizureDetailCompletion ? 'حفظ التفاصيل' : 'حفظ الطلب'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                ) : null
            );
};
