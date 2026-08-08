import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Scale, AlertTriangle, FileText, Building, Users, UserX, Send, Link, Ban, Briefcase } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: unknown) => void;
}

// Judge Recusal Modal
export const JudgeRecusalModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [reason, setReason] = useState('');
    const [requestDate, setRequestDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!reason) return;
        onConfirm({ reason, requestDate });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-rose-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-rose-900/40">
                <div className="bg-gradient-to-r from-rose-600 to-red-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <span className="text-lg">🛑</span>
                        طلب رد القاضي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-200 text-xs">
                        <AlertTriangle size={14} className="inline ml-2" />
                        تنبيه: تقديم طلب الرد يؤدي لتجميد الدعوى مؤقتاً حتى البت في الطلب
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            سبب طلب الرد <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="مثال: وجود صلة قرابة، مصلحة شخصية..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 min-h-[100px]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ تقديم الطلب
                        </label>
                        <input
                            type="date"
                            value={requestDate}
                            onChange={(e) => setRequestDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 [color-scheme:dark]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!reason}
                        className="w-full bg-gradient-to-r from-rose-600 to-red-700 text-white py-3 rounded-lg font-bold text-sm hover:from-rose-500 hover:to-red-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        تقديم طلب الرد وتجميد الدعوى
                    </button>
                </div>
            </div>
        </div>
    );
};

// Transfer Jurisdiction Modal
export const TransferJurisdictionModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [newCourt, setNewCourt] = useState('');
    const [transferDate, setTransferDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (!newCourt) return;
        onConfirm({ newCourt, transferDate, notes });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-purple-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-purple-900/40">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <span className="text-lg">🔀</span>
                        إحالة لعدم الاختصاص
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            المحكمة المحال إليها <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={newCourt}
                            onChange={(e) => setNewCourt(e.target.value)}
                            placeholder="مثال: محكمة بداءة الكرخ"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ الإحالة
                        </label>
                        <input
                            type="date"
                            value={transferDate}
                            onChange={(e) => setTransferDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500 [color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            ملاحظات (اختياري)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="سبب الإحالة أو تفاصيل إضافية..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500 min-h-[70px]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!newCourt}
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-3 rounded-lg font-bold text-sm hover:from-purple-500 hover:to-indigo-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إحالة الدعوى للمحكمة الجديدة
                    </button>
                </div>
            </div>
        </div>
    );
};

// Case Consolidation Modal
export const CaseConsolidationModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [linkedCaseNo, setLinkedCaseNo] = useState('');
    const [consolidationDate, setConsolidationDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (!linkedCaseNo) return;
        onConfirm({ linkedCaseNo, consolidationDate, notes });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-teal-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-teal-900/40">
                <div className="bg-gradient-to-r from-teal-600 to-cyan-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <Link size={18} />
                        توحيد الدعاوى
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            رقم الدعوى المرتبطة <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={linkedCaseNo}
                            onChange={(e) => setLinkedCaseNo(e.target.value)}
                            placeholder="مثال: 123/ب/2024"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ التوحيد
                        </label>
                        <input
                            type="date"
                            value={consolidationDate}
                            onChange={(e) => setConsolidationDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 [color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            سبب التوحيد (اختياري)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="مثال: وحدة الموضوع، وحدة الأطراف..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 min-h-[70px]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!linkedCaseNo}
                        className="w-full bg-gradient-to-r from-teal-600 to-cyan-700 text-white py-3 rounded-lg font-bold text-sm hover:from-teal-500 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        توحيد الدعوى
                    </button>
                </div>
            </div>
        </div>
    );
};

// Attorney Resignation Modal
export const AttorneyResignationModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [resignationType, setResignationType] = useState('تنحي');
    const [reason, setReason] = useState('');
    const [resignationDate, setResignationDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!reason) return;
        onConfirm({ resignationType, reason, resignationDate });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-red-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-red-900/40">
                <div className="bg-gradient-to-r from-red-600 to-rose-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <Ban size={18} />
                        عزل / تنحي الوكيل
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-200 text-xs font-bold">
                        <AlertTriangle size={14} className="inline ml-2" />
                        تحذير: هذا الإجراء نهائي! سيتم تعطيل جميع وظائف التحرير والجدولة في هذه القضية.
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع الإنهاء <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={resignationType}
                            onChange={(e) => setResignationType(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500"
                        >
                            <option value="تنحي">تنحي (من الوكيل)</option>
                            <option value="عزل">عزل (من الموكل)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            سبب الإنهاء <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="وضح سبب إنهاء الوكالة..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 min-h-[80px]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ الإنهاء
                        </label>
                        <input
                            type="date"
                            value={resignationDate}
                            onChange={(e) => setResignationDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 [color-scheme:dark]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!reason}
                        className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white py-3 rounded-lg font-bold text-sm hover:from-red-500 hover:to-rose-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        تأكيد إنهاء الوكالة نهائياً
                    </button>
                </div>
            </div>
        </div>
    );
};

// Execution Transfer Modal
export const ExecutionTransferModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const [executionFileNo, setExecutionFileNo] = useState('');
    const [depositDate, setDepositDate] = useState(getLocalTodayYmd());
    const [executionCourt, setExecutionCourt] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = () => {
        if (!executionFileNo) return;
        onConfirm({ executionFileNo, depositDate, executionCourt, notes });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className="bg-[#1A1E2E] border border-green-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-green-900/40">
                <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        <Briefcase size={18} />
                        إحالة لمديرية التنفيذ
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-200 text-xs">
                        انتقال من مرحلة التقاضي إلى المرحلة التنفيذية
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            رقم الإضبارة التنفيذية <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={executionFileNo}
                            onChange={(e) => setExecutionFileNo(e.target.value)}
                            placeholder="مثال: 456/تنفيذ/2024"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ الإيداع
                        </label>
                        <input
                            type="date"
                            value={depositDate}
                            onChange={(e) => setDepositDate(e.target.value)}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-green-500 [color-scheme:dark]"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            مديرية التنفيذ (اختياري)
                        </label>
                        <input
                            type="text"
                            value={executionCourt}
                            onChange={(e) => setExecutionCourt(e.target.value)}
                            placeholder="مثال: مديرية تنفيذ الكرخ"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-green-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            ملاحظات (اختياري)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="أي تفاصيل إضافية..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-green-500 min-h-[60px]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!executionFileNo}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-700 text-white py-3 rounded-lg font-bold text-sm hover:from-green-500 hover:to-emerald-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إحالة للمرحلة التنفيذية
                    </button>
                </div>
            </div>
        </div>
    );
};
