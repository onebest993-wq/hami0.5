import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { Shield } from '@/app/components/ui/icons/Shield';
import { User } from '@/app/components/ui/icons/User';
import { Phone } from '@/app/components/ui/icons/Phone';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { GuarantorInfo } from '@/app/utils/alimonyPaymentEngine';
import { useExecutionOverlayDismiss } from '@/app/components/lawyer/ExecutionDashboard/useExecutionOverlayDismiss';

interface GuarantorRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (guarantor: GuarantorInfo) => void;
    existingGuarantor?: GuarantorInfo;
}

export const GuarantorRegistrationModal: React.FC<GuarantorRegistrationModalProps> = ({
    isOpen,
    onClose,
    onSave,
    existingGuarantor
}) => {
    const [name, setName] = useState(existingGuarantor?.name || '');
    const [nameError, setNameError] = useState<string>('');
    const [phone, setPhone] = useState(existingGuarantor?.phone || '');
    const [address, setAddress] = useState(existingGuarantor?.address || '');
    const [nationalId, setNationalId] = useState(existingGuarantor?.nationalId || '');

    const containsDigits = (value: string) => /[0-9\u0660-\u0669\u06F0-\u06F9]/.test(value);

    const handleSubmit = () => {
        // Validation
        if (containsDigits(name)) {
            SmartToast.error('اسم الكفيل يجب أن يحتوي على حروف فقط (بدون أرقام)');
            return;
        }
        if (!name.trim()) {
            SmartToast.error('يرجى إدخال اسم الكفيل');
            return;
        }
        if (!phone.trim()) {
            SmartToast.error('يرجى إدخال رقم هاتف الكفيل');
            return;
        }
        if (!address.trim()) {
            SmartToast.error('يرجى إدخال عنوان الكفيل');
            return;
        }
        if (!nationalId.trim()) {
            SmartToast.error('يرجى إدخال رقم الهوية الوطنية');
            return;
        }

        const guarantorData: GuarantorInfo = {
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            nationalId: nationalId.trim(),
            registeredDate: new Date().toISOString()
        };

        onSave(guarantorData);
        SmartToast.success('✅ تم تسجيل بيانات الكفيل الضامن بنجاح');
        onClose();
    };

    useExecutionOverlayDismiss(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-gradient-to-br from-slate-900 to-slate-800 w-full max-w-lg rounded-2xl shadow-2xl border-2 border-amber-500/40 overflow-hidden"
                    >
                        {/* HEADER */}
                        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-b-2 border-amber-500/40 p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-500/20 p-2 rounded-lg">
                                        <Shield size={24} className="text-amber-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-amber-400 text-xl font-bold">تسجيل الكفيل الضامن</h2>
                                        <p className="text-amber-500/70 text-xs mt-0.5">للنفقة المستمرة - القانون العراقي</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label="إغلاق"
                                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-lg touch-manipulation"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* LEGAL WARNING */}
                        <div className="p-4 bg-rose-950/30 border-b border-rose-500/30">
                            <div className="flex items-start gap-2">
                                <Shield size={16} className="text-rose-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-rose-300 text-xs font-bold mb-1">⚠️ التزام قانوني</p>
                                    <p className="text-gray-400 text-[11px] leading-relaxed">
                                        الكفيل يلتزم بسداد النفقة الشهرية في حال تخلف المدين الكاسب عن السداد. 
                                        عدم تقديم كفيل يُفعّل الحبس الإكراهي فوراً.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* FORM BODY */}
                        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                            {/* Name */}
                            <div className="space-y-2">
                                <label className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <User size={14} className="text-amber-400" />
                                    اسم الكفيل الثلاثي
                                    <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => {
                                        const next = e.target.value;
                                        if (containsDigits(next)) {
                                            setNameError('يُمنع إدخال الأرقام في اسم الكفيل');
                                            return;
                                        }
                                        setNameError('');
                                        setName(next);
                                    }}
                                    className="w-full bg-slate-950/50 border border-amber-500/30 rounded-lg h-11 px-4 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="الاسم الكامل للكفيل"
                                />
                                {!!nameError && <div className="text-rose-300 text-xs font-bold">{nameError}</div>}
                            </div>

                            {/* National ID */}
                            <div className="space-y-2">
                                <label className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <CreditCard size={14} className="text-amber-400" />
                                    رقم الهوية الوطنية / البطاقة الموحدة
                                    <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={nationalId}
                                    onChange={(e) => setNationalId(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-amber-500/30 rounded-lg h-11 px-4 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="مثال: 123456789012"
                                />
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <Phone size={14} className="text-amber-400" />
                                    رقم الهاتف
                                    <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-amber-500/30 rounded-lg h-11 px-4 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                    placeholder="07xxxxxxxxx"
                                />
                            </div>

                            {/* Address */}
                            <div className="space-y-2">
                                <label className="text-white/80 text-sm font-semibold flex items-center gap-2">
                                    <MapPin size={14} className="text-amber-400" />
                                    العنوان الكامل
                                    <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-amber-500/30 rounded-lg h-24 p-3 text-white text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                                    placeholder="المحافظة، المحلة، الزقاق، الدار..."
                                />
                            </div>

                            {/* Confirmation Note */}
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <CheckCircle size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                    <p className="text-emerald-300 text-[11px] leading-relaxed">
                                        بتسجيل هذه البيانات، يُصبح الكفيل ملزماً قانونياً بسداد النفقة المستمرة في حال تخلف المدين.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* FOOTER */}
                        <div className="p-4 bg-slate-950/50 border-t border-amber-500/20 flex justify-end gap-3">
                            <button type="button"
                                onClick={onClose}
                                className="min-h-[44px] px-5 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm touch-manipulation"
                            >
                                إلغاء
                            </button>
                            <button type="button"
                                onClick={handleSubmit}
                                disabled={!!nameError}
                                className="min-h-[44px] bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-2.5 rounded-lg shadow-lg shadow-amber-900/30 flex items-center gap-2 font-bold transition-all transform hover:scale-105 disabled:opacity-40 touch-manipulation"
                            >
                                <Shield size={18} />
                                حفظ بيانات الكفيل
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
