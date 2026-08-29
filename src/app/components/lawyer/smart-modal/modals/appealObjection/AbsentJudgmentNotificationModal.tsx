import React, { useState } from 'react';
import { Bell } from '@/app/components/ui/icons/Bell';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { AbsentJudgmentNotificationModalProps } from '../../smartFile/modalFormTypes';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';

export const AbsentJudgmentNotificationModal = ({
    isOpen,
    onClose,
    onConfirm,
}: AbsentJudgmentNotificationModalProps) => {
    const { T, required, isPearl } = useSmartModalAccent();
    const [notificationDate, setNotificationDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) setNotificationDate(getLocalTodayYmd());
    }, [isOpen]);

    const handleSubmit = () => {
        if (!notificationDate) return;
        onConfirm({ notificationDate });
        onClose();
    };

    if (!isOpen) return null;

    const hintClass = isPearl ? 'text-[#ECE8E2]/80' : 'text-white/60';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-lg">
            <SmartModalHeader icon={Bell} title="التبليغ بالحكم الغيابي" onClose={onClose} />
            <div className={T.body}>
                <p className={`text-xs leading-relaxed ${hintClass}`}>
                    سجّل تاريخ التبليغ الرسمي للحكم الغيابي. تُحتسب مهلة الاعتراض (10 أيام) من هذا التاريخ.
                </p>
                <div>
                    <label className={T.label}>
                        تاريخ التبليغ <span className={required}>*</span>
                    </label>
                    <input
                        type="date"
                        value={notificationDate}
                        onChange={(e) => setNotificationDate(e.target.value)}
                        className={T.field}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!notificationDate}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    حفظ التبليغ
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
