import React, { useState } from 'react';
import { Calendar } from '@/app/components/ui/icons/Calendar';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import { addCalendarDaysYmd } from '@/app/utils/executionYmdCalendar';
import type { InterlocutoryAppealModalProps } from '../../smartFile/modalFormTypes';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';

export const InterlocutoryAppealModal = ({
    isOpen,
    onClose,
    onConfirm,
    editMode = false,
    editData,
}: InterlocutoryAppealModalProps) => {
    const { T, required, highlight, deadlineBox, optionClass, isPearl } = useSmartModalAccent();
    const [decisionType, setDecisionType] = useState('');
    const [decisionDate, setDecisionDate] = useState(getLocalTodayYmd());
    const [calculatedDeadline, setCalculatedDeadline] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setDecisionType(editData.decisionType || '');
                setDecisionDate(editData.decisionDate || getLocalTodayYmd());
            } else {
                setDecisionType('');
                setDecisionDate(getLocalTodayYmd());
            }
        }
    }, [isOpen, editMode, editData]);

    React.useEffect(() => {
        if (decisionDate && /^\d{4}-\d{2}-\d{2}$/.test(String(decisionDate).trim())) {
            setCalculatedDeadline(addCalendarDaysYmd(String(decisionDate).trim().slice(0, 10), 7));
        }
    }, [decisionDate]);

    const handleSubmit = () => {
        if (!decisionType || !decisionDate) return;
        onConfirm({ decisionType, decisionDate, calculatedDeadline, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const DECISION_TYPES = [
        'قرار استئخار الدعوى',
        'رفض توحيد دعويين',
        'رفض الإحالة لعدم الاختصاص',
        'إبطال عريضة الدعوى',
        'رفض طلب التصحيح',
        'قرارات الأمور المستعجلة',
        'أخرى (مادة 216)',
    ];

    const title = editMode ? 'تحديث قرار تمييزي' : 'تمييز قرار إعدادي / مستعجل (مادة 216)';

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-xl">
            <SmartModalHeader icon={Gavel} title={title} onClose={onClose} />
            <div className={`${T.body} md:min-h-[28rem] md:space-y-4`}>
                <div>
                    <label className={T.label}>
                        نوع القرار المطعون فيه <span className={required}>*</span>
                    </label>
                    <select
                        value={decisionType}
                        onChange={(e) => setDecisionType(e.target.value)}
                        className={T.select}
                        dir="rtl"
                        autoFocus
                    >
                        <option value="" className={optionClass}>
                            -- اختر نوع القرار --
                        </option>
                        {DECISION_TYPES.map((d) => (
                            <option key={d} value={d} className={optionClass}>
                                {d}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className={T.label}>
                        تاريخ صدور القرار / التبلغ به <span className={required}>*</span>
                    </label>
                    <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} className={T.field} />
                </div>

                <div className={deadlineBox}>
                    <span className="text-[10px] text-white/40">آخر موعد لتقديم الطعن (المهلة القانونية)</span>
                    <div className={`text-lg font-bold ${highlight} flex items-center gap-2`}>
                        <Calendar size={16} />
                        {calculatedDeadline}
                        <span className={`text-xs ${isPearl ? 'text-[#F0A8B4]/50' : 'text-[#E6C673]/50'}`}>(7 أيام)</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!decisionType || !decisionDate}
                    className={`${T.btn} ${T.btnDisabled} flex items-center justify-center gap-2`}
                >
                    {editMode ? 'تحديث البيانات' : 'تأكيد وإضافة للتذكيرات'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
