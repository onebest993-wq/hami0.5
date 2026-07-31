import React, { useState } from 'react';
import { CheckSquare } from 'lucide-react';
import type { AddTaskModalProps } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';
import { SmartModalHeader } from './shared';

export const AddTaskModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddTaskModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setDueDate(editData.dueDate || '');
        } else {
            setTitle('');
            setDueDate('');
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        if (!title) return;
        onAdd({ title, dueDate, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
        setTitle(''); setDueDate('');
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-3xl">
            <SmartModalHeader T={T} icon={CheckSquare} title={editMode ? 'تحديث مهمة إدارية' : 'إضافة مهمة إدارية'} onClose={onClose} />
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.taskModal} className={T.useMoroccanCorners ? 'p-5 sm:p-6 space-y-5 md:min-h-[24rem]' : T.body}>
                <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] md:items-start">
                    <div>
                        <label className={T.label}>
                            عنوان المهمة <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.taskTitle}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="عنوان المهمة"
                            className={T.field}
                            autoFocus
                        />
                    </div>

                    <div className="rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.02))] p-4 space-y-4">
                        <div>
                            <label className={T.label}>
                                تاريخ الإنجاز (اختياري)
                            </label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={T.field}
                            />
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-3 text-[11px] text-white/45">
                            ستظهر المهمة مباشرة داخل قسم المهام الإدارية في نفس المرحلة.
                        </div>
                    </div>
                </div>
                <button
                    type="button"
                    data-testid={CIVIL_LAWSUIT_TEST_IDS.taskSubmit}
                    onClick={handleSubmit}
                    disabled={!title}
                    className={T.btn}
                >
                    {editMode ? 'تحديث البيانات' : 'حفظ المهمة'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
