import React, { useState } from 'react';
import { CheckSquare } from '@/app/components/ui/icons/CheckSquare';
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
        <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-xl">
            <SmartModalHeader T={T} icon={CheckSquare} title={editMode ? 'تحديث مهمة إدارية' : 'إضافة مهمة إدارية'} onClose={onClose} />
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.taskModal} className={T.body}>
                <div className="space-y-3">
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
                    <p className="text-[11px] text-white/40">
                        ستظهر المهمة مباشرة داخل قسم المهام الإدارية في نفس المرحلة.
                    </p>
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
