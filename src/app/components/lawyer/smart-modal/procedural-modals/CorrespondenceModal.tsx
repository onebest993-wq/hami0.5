// @ts-nocheck
import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { MoroccanGlassShell } from '../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../smartFile/smartModalChrome';

type CorrespondenceModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { entity: string; date: string; content: string }) => void;
};

export const CorrespondenceModal = ({ isOpen, onClose, onConfirm }: CorrespondenceModalProps) => {
    const { T, required } = useSmartModalAccent();
    const [entity, setEntity] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());
    const [content, setContent] = useState('');

    React.useEffect(() => {
        if (!isOpen) return;
        setEntity('');
        setDate(getLocalTodayYmd());
        setContent('');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-2xl">
            <SmartModalHeader icon={Send} title="المخاطبات" onClose={onClose} />
            <div className={`${T.body} md:min-h-[28rem] md:space-y-6`}>
                <div>
                    <label className={T.label}>
                        الجهة المخاطبة <span className={required}>*</span>
                    </label>
                    <input
                        type="text"
                        value={entity}
                        onChange={(e) => setEntity(e.target.value)}
                        className={T.field}
                        placeholder="مثال: مديرية التنفيذ / المحكمة / الخصم"
                    />
                </div>
                <div>
                    <label className={T.label}>تاريخ المخاطبة</label>
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={T.field} />
                </div>
                <div>
                    <label className={T.label}>
                        مضمون المخاطبة <span className={required}>*</span>
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className={`${T.field} min-h-[160px] resize-none`}
                        placeholder="نص المخاطبة أو ملخصها"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (!entity.trim() || !content.trim()) return;
                        onConfirm({ entity: entity.trim(), date, content: content.trim() });
                        onClose();
                    }}
                    disabled={!entity.trim() || !content.trim()}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    حفظ ومتابعة الرد
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
