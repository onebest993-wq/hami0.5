import React, { useState } from 'react';
import { Calendar, Pencil, Trash2 } from '@/app/components/ui/lucideIcons';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { AddAppointmentModalProps } from '../../smartFile/modalFormTypes';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';
import { ManualClassificationPicker } from '../../smartFile/ManualClassificationPicker';
import { normalizeManualClassificationTag } from '../../smartFile/manualClassificationTemplates';
import { ModalInlineTimeline, SmartModalHeader } from './shared';

export const AddAppointmentModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    recentAppointments = [],
    onDeleteAppointment,
    onEditAppointment,
    browseOnly = false,
}: AddAppointmentModalProps) => {
    const T = useSmartFileModalTheme();
    const [date, setDate] = useState('');
    const [details, setDetails] = useState('');
    const [purpose, setPurpose] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [timelineExpanded, setTimelineExpanded] = useState(true);

    React.useEffect(() => {
        if (editMode && editData) {
            setDate(editData.date || '');
            setDetails(editData.details || '');
            setPurpose(editData.purpose || editData.title || '');
            const tags = Array.isArray(editData.tags) ? editData.tags : [];
            setSelectedTags(
                tags
                    .map((tag) => normalizeManualClassificationTag(String(tag)))
                    .filter(Boolean)
                    .slice(0, 1),
            );
        } else {
            setDate(getLocalTodayYmd());
            setDetails('');
            setPurpose('');
            setSelectedTags([]);
            setTimelineExpanded(true);
        }
    }, [editMode, editData]);

    const handleSubmit = async () => {
        const trimmedPurpose = purpose.trim();
        if (!date || !trimmedPurpose) return;
        setSaving(true);
        try {
            await Promise.resolve(
                onAdd({
                    title: trimmedPurpose,
                    date,
                    details: details.trim(),
                    purpose: trimmedPurpose,
                    ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
                    ...(editMode && editData ? { id: editData.id } : {}),
                }),
            );
            if (!editMode) {
                setDate(getLocalTodayYmd());
                setDetails('');
                setPurpose('');
                setSelectedTags([]);
            }
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentModal}
            maxWidth="max-w-4xl"
            className="min-h-[min(82dvh,740px)]"
        >
            <SmartModalHeader
                T={T}
                icon={Calendar}
                title={browseOnly ? 'مواعيد الإضبارة — للاطلاع' : editMode ? 'تعديل موعد' : 'موعد جديد'}
                onClose={onClose}
            />
            <div
                className={
                    browseOnly
                        ? 'p-5 sm:p-6'
                        : T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 md:min-h-[min(74dvh,620px)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start'
                        : T.body
                }
            >
                {!browseOnly ? (
                <div className="space-y-5">
                    <div>
                        <label className={T.label}>
                            الغاية من الموعد <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={purpose}
                            onChange={(e) => setPurpose(e.target.value)}
                            placeholder="اكتب الغاية من الموعد..."
                            data-testid="smart-file-appointment-purpose-manual"
                            className={T.field}
                        />
                    </div>

                    <div>
                        <label className={T.label}>
                            تاريخ الموعد <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={T.field}
                        />
                    </div>
                    <ManualClassificationPicker
                        mode="single"
                        selected={selectedTags}
                        onSelectedChange={setSelectedTags}
                        placeholder="مثال: #مرافعة"
                        inputTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagManualInput}
                        addTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagManualAdd}
                        chipTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagTemplateChip}
                        removeTestId={CIVIL_LAWSUIT_TEST_IDS.appointmentTagTemplateRemove}
                    />
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving || !date || !purpose.trim()}
                        className={T.btn}
                    >
                        {saving ? 'جارٍ حفظ الموعد...' : editMode ? 'تحديث الموعد' : 'حفظ الموعد'}
                    </button>
                </div>
                ) : null}
                <div className={browseOnly ? '' : 'flex h-full flex-col gap-5'}>
                    <ModalInlineTimeline
                        title={browseOnly ? 'مواعيد هذه المرحلة' : 'سجل المواعيد داخل هذا القسم'}
                        emptyLabel="لا توجد مواعيد محفوظة في هذه المرحلة بعد"
                        items={recentAppointments}
                        collapsible={!browseOnly}
                        expanded={timelineExpanded}
                        onToggle={() => setTimelineExpanded((prev) => !prev)}
                        renderMeta={(item) =>
                            Array.isArray(item.tags) && item.tags.length > 0
                                ? `التصنيف: ${item.tags.join(' • ')}`
                                : item.subType
                                  ? `التصنيف: ${String(item.subType)}`
                                  : null
                        }
                        renderActions={
                            browseOnly
                                ? undefined
                                : (item) => (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onEditAppointment?.(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                                >
                                    <Pencil size={12} />
                                    تعديل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteAppointment?.(String(item.id))}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                                >
                                    <Trash2 size={12} />
                                    حذف
                                </button>
                            </div>
                        )
                        }
                    />
                </div>
            </div>
        </MoroccanGlassShell>
    );
};
