import React from 'react';
import { X } from 'lucide-react';
import { ecg } from '@/app/components/lawyer/ExecutionCreationView/components/executionCreationGlassUi';

/** غلاف فوري أثناء تحميل chunk نموذج الإنشاء — نفس هيكل الرأس بدون تغيير بصري */
export function ExecutionCreationBootShell({ onClose }: { onClose: () => void }) {
    return (
        <div dir="rtl" className={ecg.modalShell}>
            <div className={ecg.modalHeader}>
                <h1 className="text-lg font-bold text-[#E6C673]">فتح إضبارة تنفيذ</h1>
                <button type="button" onClick={onClose} className={ecg.modalClose} aria-label="إغلاق">
                    <X size={20} />
                    <span className="text-sm font-medium">إغلاق</span>
                </button>
            </div>
            <div className={ecg.modalBody}>
                <p className="px-3 py-6 text-center text-sm text-slate-500">جاري تجهيز النموذج…</p>
            </div>
        </div>
    );
}
