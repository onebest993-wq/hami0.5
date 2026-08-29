import React, { useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { OpponentAbsentObjectionModalProps } from '../../smartFile/modalFormTypes';
import {
    deriveAbsentObjectionCaseNumber,
    resolveAppealStageCaseNumber,
} from '../../smartFile/absentObjectionCaseNumber';
import {
    GLASS_BTN,
    GLASS_FIELD,
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';

export const OpponentAbsentObjectionModal = ({
    isOpen,
    onClose,
    onConfirm,
    sourceCaseNumber = '',
}: OpponentAbsentObjectionModalProps) => {
    const [newCaseNumber, setNewCaseNumber] = useState('');
    const [filingDate, setFilingDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) {
            setNewCaseNumber('');
            setFilingDate(getLocalTodayYmd());
        }
    }, [isOpen, sourceCaseNumber]);

    const resolvedCaseNumber = resolveAppealStageCaseNumber(
        'اعتراض على الحكم الغيابي',
        newCaseNumber,
        sourceCaseNumber,
    );

    const handleSubmit = () => {
        if (!filingDate) return;
        onConfirm({ newCaseNumber: resolvedCaseNumber, filingDate });
        onClose();
    };

    if (!isOpen) return null;

    const derivedHint = deriveAbsentObjectionCaseNumber(sourceCaseNumber);

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <div className={GLASS_MODAL_HEADER}>
                <h3 className="font-bold text-[14px] text-white/95">
                    اعتراض المدعى عليه بالحكم الغيابي
                </h3>
                <MoroccanCloseButton onClick={onClose} />
                <MoroccanHeaderDivider />
            </div>
            <div className="p-5 space-y-4">
                <p className="text-xs text-white/50 leading-relaxed">
                    يُفتح سجل جديد بمرحلة الاعتراض على الحكم الغيابي مع انقلاب المراكز القانونية.
                </p>
                <div>
                    <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                        رقم دعوى الاعتراض (اختياري)
                    </label>
                    <input
                        type="text"
                        value={newCaseNumber}
                        onChange={(e) => setNewCaseNumber(e.target.value)}
                        className={GLASS_FIELD}
                        placeholder="اتركه فارغاً إذا لم يتوفر بعد"
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {derivedHint ? (
                        <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                            اقتراح عند توفر الرقم: {derivedHint}
                        </p>
                    ) : null}
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-white/50 mb-1.5">
                        تاريخ تقديم الاعتراض <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="date"
                        value={filingDate}
                        onChange={(e) => setFilingDate(e.target.value)}
                        className={GLASS_FIELD}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!filingDate}
                    className={GLASS_BTN}
                >
                    إنشاء إضبارة الاعتراض
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
