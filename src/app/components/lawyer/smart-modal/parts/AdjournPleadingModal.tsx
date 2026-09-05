import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { X } from '@/app/components/ui/icons/X';
import { useJudgmentModalStyles } from '../smartFile/smartModalChrome';
import { JudgmentDateField } from './judgment/JudgmentDateField';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type { JudgmentPayload } from '../smartFile/judgmentTypes';

export function AdjournPleadingModal({
    isOpen,
    onClose,
    onConfirm,
    stageName = '',
}: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: JudgmentPayload) => boolean | void;
    stageName?: string;
}) {
    const s = useJudgmentModalStyles();
    const [sessionDate, setSessionDate] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        setSessionDate('');
    }, [isOpen]);

    const handleSave = () => {
        if (!String(sessionDate).trim()) {
            SmartToast.error('حدد تاريخ الجلسة / الموعد القادم');
            return;
        }
        const saved = onConfirm({
            action: 'adjourn_pleading',
            judgmentDate: sessionDate,
            stageName,
            isPleadingsClosed: false,
        });
        if (saved !== false) onClose();
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={s.overlay}
            dir="rtl"
            hidden={!isOpen}
            aria-hidden={!isOpen}
            style={isOpen ? undefined : { display: 'none' }}
        >
            {isOpen ? (
                <div className={s.shell}>
                    <div className={s.header}>
                        <h2 className={s.headerTitle}>فتح باب المرافعة</h2>
                        <button type="button" onClick={onClose} className={s.closeBtn} aria-label="إغلاق">
                            <X size={18} />
                        </button>
                    </div>
                    <div className={s.body}>
                        <JudgmentDateField
                            styles={s}
                            judgmentDate={sessionDate}
                            onChange={setSessionDate}
                            label="تاريخ الجلسة / الموعد القادم"
                            mode="date"
                        />
                        <button
                            type="button"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.judgmentAdjournPleading}
                            onClick={handleSave}
                            className={
                                s.isPearl
                                    ? s.btnNeutral
                                    : 'w-full min-h-[44px] rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white/85 transition-colors hover:bg-white/[0.08]'
                            }
                        >
                            تأكيد فتح باب المرافعة
                        </button>
                    </div>
                </div>
            ) : null}
        </div>,
        document.body,
    );
}
