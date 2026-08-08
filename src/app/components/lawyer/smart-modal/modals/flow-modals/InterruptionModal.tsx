import React, { useState } from 'react';
import { AlertTriangle, X } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import {
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
import type { InterruptionModalProps } from '../../smartFile/modalFormTypes';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export const InterruptionModal = ({
    isOpen,
    onClose,
    onConfirm,
    currentParties = [],
    editMode = false,
    editData,
}: InterruptionModalProps) => {
    const T = useSmartFileModalTheme();
    const [reason, setReason] = useState('');
    const [affectedParty, setAffectedParty] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setReason(editData.reason || '');
                setAffectedParty(editData.affectedParty || '');
                setDate(editData.date || getLocalTodayYmd());
                setNotes(editData.notes || '');
            } else {
                setReason('');
                setAffectedParty('');
                setDate(getLocalTodayYmd());
                setNotes('');
            }
        }
    }, [isOpen, editMode, editData]);

    const handleSubmit = () => {
        if (!reason || !affectedParty || !date) return;
        onConfirm({ reason, affectedParty, date, notes, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const LEGAL_REASONS = ['وفاة أحد الخصوم', 'فقدان أهلية الخصومة', 'زوال صفة الممثل القانوني'];

    const optionClass = T.variant === 'personal-pearl' ? 'bg-[#16161F] text-[#FFFEF9]' : 'bg-[#0A0F1C] text-white';
    const title = editMode ? 'تحديث انقطاع السير' : 'انقطاع السير في الدعوى';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-md">
            <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
                <h3 className={T.useMoroccanCorners ? 'font-bold flex items-center gap-2 text-[14px] text-white/95' : T.headerTitle}>
                    <AlertTriangle size={17} className={T.headerIcon} strokeWidth={1.75} />
                    {title}
                </h3>
                {T.useMoroccanCorners ? (
                    <MoroccanCloseButton onClick={onClose} />
                ) : (
                    <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                        <X size={16} />
                    </button>
                )}
                {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
            </div>

            <div className={T.body}>
                <div>
                    <label className={T.label}>
                        السبب القانوني <span className="text-red-400">*</span>
                    </label>
                    <select
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className={T.select}
                        dir="rtl"
                        autoFocus
                    >
                        <option value="" className={optionClass}>
                            -- اختر السبب --
                        </option>
                        {LEGAL_REASONS.map((r) => (
                            <option key={r} value={r} className={optionClass}>
                                {r}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={T.label}>
                        الخصم المعني <span className="text-red-400">*</span>
                    </label>
                    <select value={affectedParty} onChange={(e) => setAffectedParty(e.target.value)} className={T.select} dir="rtl">
                        <option value="" className={optionClass}>
                            -- اختر الخصم --
                        </option>
                        {currentParties.map((party: { name?: string; role?: string }, idx: number) => (
                            <option key={idx} value={party.name} className={optionClass}>
                                {party.name} ({party.role || 'طرف'})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={T.label}>
                        تاريخ الواقعة <span className="text-red-400">*</span>
                    </label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={T.field} />
                </div>

                <div>
                    <label className={T.label}>ملاحظات (اختياري)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${T.field} resize-none`} />
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!reason || !affectedParty || !date}
                    className={`${T.btn} ${T.btnDisabled} active:scale-[0.99] flex justify-center items-center gap-2`}
                >
                    {editMode ? 'تحديث البيانات' : 'تأكيد الانقطاع وتجميد الدعوى'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
