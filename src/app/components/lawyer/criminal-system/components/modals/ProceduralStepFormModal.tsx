import React, { useEffect, useRef, useState } from 'react';
import { ModalIsoDateInput } from '../ModalIsoDateInput';
import { CriminalModalPortal, CRIMINAL_MODAL_Z } from '../../criminalModalPortal';
import {
    PROCEDURAL_STEP_STATUS_OPTIONS,
    type ProceduralPathStep,
    type ProceduralPathStepStatus,
    isProceduralStepStatus,
} from '../../proceduralPathsEngine';

export type ProceduralStepFormModalProps = {
    open: boolean;
    initial?: ProceduralPathStep | null;
    onClose: () => void;
    onSubmit: (payload: Omit<ProceduralPathStep, 'id'> & { id?: string }) => void;
};

export const ProceduralStepFormModal = ({ open, initial, onClose, onSubmit }: ProceduralStepFormModalProps) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [status, setStatus] = useState<ProceduralPathStepStatus>('in_progress');

    /**
     * نَتَّبع هَوية فَتح المودال — تَهيئة الحقول تَحدث مرة واحدة عند الانفتاح
     * فقط، حتى لا يَمحو re-render من الأب النَّص المَكتوب أو الحقول الأخرى.
     */
    const lastInitializedOpenRef = useRef(false);
    useEffect(() => {
        if (!open) {
            lastInitializedOpenRef.current = false;
            return;
        }
        if (lastInitializedOpenRef.current) return;
        lastInitializedOpenRef.current = true;
        setTitle(String(initial?.title ?? '').trim());
        setDate(String(initial?.date ?? '').trim() || new Date().toISOString().slice(0, 10));
        setStatus(initial?.status && isProceduralStepStatus(initial.status) ? initial.status : 'in_progress');
    }, [open, initial]);

    if (!open) return null;

    return (
        <CriminalModalPortal zIndex={CRIMINAL_MODAL_Z.procedural}>
            <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 overflow-hidden">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between gap-3">
                    <div className="text-white font-black text-sm">
                        {initial?.id ? 'تعديل خطوة' : 'إضافة خطوة'}
                    </div>
                    <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-sm font-bold">
                        إغلاق
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">عنوان الإجراء *</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="اكتب الإجراء بحرية..."
                        />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">التاريخ *</label>
                        <ModalIsoDateInput value={date} onChange={setDate} />
                    </div>
                    <div>
                        <label className="block text-white/70 text-xs font-black mb-1">الحالة</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                            value={status}
                            onChange={(e) => {
                                const v = e.target.value;
                                if (isProceduralStepStatus(v)) setStatus(v);
                            }}
                        >
                            {PROCEDURAL_STEP_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value} className="bg-slate-900">
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-black text-white/75"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            disabled={!title.trim() || !date.trim()}
                            onClick={() =>
                                onSubmit({
                                    id: initial?.id,
                                    title: title.trim(),
                                    date: date.trim(),
                                    status,
                                })
                            }
                            className="rounded-xl bg-[#E6C673] text-[#0B1021] px-4 py-2 text-sm font-black disabled:opacity-40"
                        >
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </CriminalModalPortal>
    );
};
