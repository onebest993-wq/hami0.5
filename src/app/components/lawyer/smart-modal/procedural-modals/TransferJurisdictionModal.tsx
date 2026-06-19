import React, { useState } from 'react';
import { Scale } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { MoroccanGlassShell } from '../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';

type ModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: unknown) => void;
};

export const TransferJurisdictionModal = ({ isOpen, onClose, onConfirm }: ModalProps) => {
    const { T, required } = useSmartModalAccent();
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
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-lg">
            <SmartModalHeader icon={Scale} title="إحالة لعدم الاختصاص" onClose={onClose} />
            <div className={T.body}>
                <div>
                    <label className={T.label}>
                        المحكمة المحال إليها <span className={required}>*</span>
                    </label>
                    <input type="text" value={newCourt} onChange={(e) => setNewCourt(e.target.value)} className={T.field} />
                </div>
                <div>
                    <label className={T.label}>تاريخ الإحالة</label>
                    <input
                        type="date"
                        value={transferDate}
                        onChange={(e) => setTransferDate(e.target.value)}
                        className={T.field}
                    />
                </div>
                <div>
                    <label className={T.label}>ملاحظات (اختياري)</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={`${T.field} min-h-[70px]`} />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!newCourt}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    إحالة الدعوى للمحكمة الجديدة
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
