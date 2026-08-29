import React, { useState } from 'react';
import { Shield } from '@/app/components/ui/icons/Shield';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { ObjectionRegistrationModalProps } from '../../smartFile/modalFormTypes';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';

export const ObjectionRegistrationModal = ({ isOpen, onClose, onConfirm }: ObjectionRegistrationModalProps) => {
    const { T, required } = useSmartModalAccent();
    const [objectionDate, setObjectionDate] = useState(getLocalTodayYmd());
    const [sessionDate, setSessionDate] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setObjectionDate(getLocalTodayYmd());
            setSessionDate('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!objectionDate || !sessionDate) return;
        onConfirm({ objectionDate, sessionDate, receiptNumber: '' });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-sm">
            <SmartModalHeader icon={Shield} title="تسجيل اعتراض غيابي" onClose={onClose} />
            <div className={`${T.body} space-y-4`}>
                <p className="text-xs text-white/50 leading-relaxed">
                    سيتم فتح سجل جديد لمرافعة الاعتراض الغيابي وتجميد الحكم السابق لحين حسم الاعتراض.
                </p>

                <div>
                    <label className={T.label}>تاريخ تقديم الاعتراض</label>
                    <input
                        type="date"
                        value={objectionDate}
                        onChange={(e) => setObjectionDate(e.target.value)}
                        className={T.field}
                    />
                </div>

                <div>
                    <label className={T.label}>
                        موعد الجلسة الأولى <span className={required}>*</span>
                    </label>
                    <input
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className={T.field}
                        autoFocus
                    />
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!objectionDate || !sessionDate}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    بدء مرافعة الاعتراض
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
