import React, { useState } from 'react';
import {
    Calendar,
    CheckSquare,
    DollarSign,
    FileText,
    Pencil,
    Trash2,
    X,
} from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge';
import { DossierFastNoteComposer } from '@/app/components/lawyer/dossier-notes/DossierFastNoteComposer';
import { DossierNotesVault, type DossierVaultNote } from '@/app/components/lawyer/dossier-notes/DossierNotesVault';
import type {
    AddAppointmentModalProps,
    AddNoteModalProps,
    AddPaymentModalProps,
    AddTaskModalProps,
} from '../../smartFile/modalFormTypes';
import {
    MoroccanGlassShell,
} from '../../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';
import { SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS } from '../../smartFile/smartFileOverlayZ';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { ManualClassificationPicker } from '../../smartFile/ManualClassificationPicker';
import { normalizeManualClassificationTag } from '../../smartFile/manualClassificationTemplates';
import * as Shared from './contentEntryShared';

const {
    SmartModalHeader,
    ModalInlineTimeline,
    normalizeDocLookupValue: _normalizeDocLookupValue,
    normalizeDocLookupStem: _normalizeDocLookupStem,
    findVaultDocForTimelineItem: _findVaultDocForTimelineItem,
    inferDocumentCategoryFromFile: _inferDocumentCategoryFromFile,
    extractDocumentUserNotes: _extractDocumentUserNotes,
    extractVaultDocSnapshot: _extractVaultDocSnapshot,
    DocumentTimelinePreview: _DocumentTimelinePreview,
    FullDocumentPreviewOverlay: _FullDocumentPreviewOverlay,
} = Shared;

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


export const AddNoteModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    dossierContext,
    voiceUserId,
    savedNotes = [],
    onDeleteNote,
}: AddNoteModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [bodyHtml, setBodyHtml] = useState('');
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

    const noteContext =
        dossierContext ??
        ({
            kind: 'lawsuit',
            lawsuitType: 'civil',
        } as const);

    const isEditing = Boolean(editingNoteId || (editMode && editData?.id));

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setBodyHtml(editData.details || '');
            setEditingNoteId(editData.id ? String(editData.id) : null);
        } else if (isOpen) {
            setTitle('');
            setBodyHtml('');
            setEditingNoteId(null);
        }
    }, [editMode, editData, isOpen]);

    const resetComposer = () => {
        setTitle('');
        setBodyHtml('');
        setEditingNoteId(null);
    };

    const commitNote = (payload: { title: string; bodyHtml: string }) => {
        onAdd({
            title: payload.title,
            details: payload.bodyHtml,
            ...(editingNoteId ? { id: editingNoteId } : editMode && editData?.id ? { id: editData.id } : {}),
        });
        resetComposer();
        SmartToast.success(isEditing ? 'تم تحديث الملاحظة' : 'تم حفظ الملاحظة في مخزن الإضبارة');
    };

    const handleVaultEdit = (note: DossierVaultNote) => {
        setTitle(note.title);
        setBodyHtml(note.body);
        setEditingNoteId(note.id);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.noteModal}
            maxWidth="max-w-4xl"
        >
            <SmartModalHeader
                T={T}
                icon={FileText}
                title={isEditing ? 'تعديل ملاحظة' : 'ملاحظات الإضبارة'}
                onClose={onClose}
            />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 md:grid-cols-2 md:items-start'
                        : T.body
                }
            >
                <div className="order-2 max-h-[28vh] overflow-y-auto overscroll-contain rounded-[20px] border border-white/[0.08] bg-black/10 p-2.5 sm:p-3 md:order-1 md:max-h-[min(68dvh,560px)]">
                    <DossierNotesVault
                        notes={savedNotes}
                        onEdit={handleVaultEdit}
                        onDelete={onDeleteNote}
                        variant="repo"
                        heading="مخزن الملاحظات"
                        emptyLabel="لا توجد ملاحظات محفوظة بعد — اكتب ملاحظة جديدة أدناه."
                        lawContext={noteContext}
                    />
                </div>
                <div className="order-1 min-w-0 border-b border-white/[0.08] pb-3 md:order-2 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                    <p className="mb-2.5 text-xs font-bold text-[#E6C673]/85">
                        {isEditing ? 'تعديل الملاحظة' : 'ملاحظة جديدة'}
                    </p>
                    <DossierFastNoteComposer
                        title={title}
                        onTitleChange={setTitle}
                        bodyHtml={bodyHtml}
                        onBodyChange={setBodyHtml}
                        context={noteContext}
                        onSave={commitNote}
                        onCancel={() => {
                            if (isEditing) resetComposer();
                            else onClose();
                        }}
                        saveLabel={isEditing ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
                        voiceUserId={voiceUserId ?? resolveCalendarUserId()}
                        onVoiceNote={(voicePayload) => {
                            commitNote({ title: voicePayload.title, bodyHtml: voicePayload.body });
                        }}
                        expanded
                    />
                </div>
            </div>
        </MoroccanGlassShell>
    );
};


export const AddPaymentModal = ({ isOpen, onClose, onAdd }: AddPaymentModalProps) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());

    const handleSubmit = () => {
        if (!amount) return;
        onAdd(Number(amount), date);
        onClose();
        setAmount('');
    };

    if (!isOpen) return null;

    return (
        <div className={SMART_FILE_NESTED_MODAL_OVERLAY_DARK_CLASS}>
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                 <div className="bg-[#E6C673] p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2"><DollarSign size={18}/> تسجيل دفعة جديدة</h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                 </div>
                <div className="p-5 space-y-4">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" autoFocus />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] [color-scheme:dark]" />
                    <button type="button" onClick={handleSubmit} className="w-full bg-[#E6C673] text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-[#F4D03F] transition-all shadow-lg shadow-[#E6C673]/20">تسجيل</button>
                </div>
            </div>
        </div>
    );
};


export const AddAppointmentModal = ({
    isOpen,
    onClose,
    onAdd,
    editMode = false,
    editData,
    recentAppointments = [],
    onDeleteAppointment,
    onEditAppointment,
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
            <SmartModalHeader T={T} icon={Calendar} title={editMode ? 'تعديل موعد' : 'موعد جديد'} onClose={onClose} />
            <div
                className={
                    T.useMoroccanCorners
                        ? 'grid gap-5 p-5 sm:p-6 md:min-h-[min(74dvh,620px)] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-start'
                        : T.body
                }
            >
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
                <div className="flex h-full flex-col gap-5">
                    <ModalInlineTimeline
                        title="سجل المواعيد داخل هذا القسم"
                        emptyLabel="لا توجد مواعيد محفوظة في هذه المرحلة بعد"
                        items={recentAppointments}
                        collapsible
                        expanded={timelineExpanded}
                        onToggle={() => setTimelineExpanded((prev) => !prev)}
                        renderMeta={(item) =>
                            Array.isArray(item.tags) && item.tags.length > 0
                                ? `التصنيف: ${item.tags.join(' • ')}`
                                : item.subType
                                  ? `التصنيف: ${String(item.subType)}`
                                  : null
                        }
                        renderActions={(item) => (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onEditAppointment?.(item)}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-1.5 text-[10px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                                >
                                    <Pencil size={12} />
                                    تعديل
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDeleteAppointment?.(String(item.id))}
                                    className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                                >
                                    <Trash2 size={12} />
                                    حذف
                                </button>
                            </div>
                        )}
                    />
                </div>
            </div>
        </MoroccanGlassShell>
    );
};

