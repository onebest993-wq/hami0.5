import React, { useState } from 'react';
import {
    Calendar,
    CheckSquare,
    DollarSign,
    FileText,
    Paperclip,
    UploadCloud,
    X,
} from 'lucide-react';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { CIVIL_LAWSUIT_TEST_IDS } from '../smartFile/civilLawsuitTestIds';
import type {
    AddAppointmentModalProps,
    AddDocumentModalProps,
    AddNoteModalProps,
    AddPaymentModalProps,
    AddTaskModalProps,
} from '../smartFile/modalFormTypes';
import {
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
    GLASS_MODAL_HEADER,
} from '../smartFile/moroccanGlassShell';
import { useSmartFileModalTheme } from '../smartFile/smartFileModalTheme';
import { ManualClassificationPicker } from '../smartFile/ManualClassificationPicker';
import { normalizeManualClassificationTag } from '../smartFile/manualClassificationTemplates';

function SmartModalHeader({
    T,
    icon: Icon,
    title,
    onClose,
}: {
    T: ReturnType<typeof useSmartFileModalTheme>;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    title: string;
    onClose: () => void;
}) {
    return (
        <div className={T.useMoroccanCorners ? GLASS_MODAL_HEADER : T.header}>
            <h3 className={T.useMoroccanCorners ? 'font-bold flex items-center gap-2 text-[14px] text-white/95' : T.headerTitle}>
                <Icon size={17} className={T.headerIcon} strokeWidth={1.75} />
                {title}
            </h3>
            {T.useMoroccanCorners ? <MoroccanCloseButton onClick={onClose} /> : (
                <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                    <X size={16} />
                </button>
            )}
            {T.useMoroccanCorners ? <MoroccanHeaderDivider /> : null}
        </div>
    );
}


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
        <MoroccanGlassShell onOverlayClick={onClose}>
            <SmartModalHeader T={T} icon={CheckSquare} title={editMode ? 'تحديث مهمة إدارية' : 'إضافة مهمة إدارية'} onClose={onClose} />
            <div data-testid={CIVIL_LAWSUIT_TEST_IDS.taskModal} className={T.useMoroccanCorners ? 'p-4 space-y-4' : T.body}>
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


export const AddDocumentModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddDocumentModalProps) => {
    const T = useSmartFileModalTheme();
    const isPearl = T.variant === 'personal-pearl';
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setCategory(editData.category || editData.docCategory || '');
            setSelectedFile(null);
        } else {
            setTitle('');
            setCategory('');
            setSelectedFile(null);
        }
    }, [editMode, editData]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            if (!title) {
                setTitle(e.target.files[0].name.split('.')[0]);
            }
        }
    };

    const handleSubmit = () => {
        if (!title || !category) return;

        onAdd({
            title,
            category,
            details: `نوع المستند: ${category}`,
            fileName: selectedFile?.name,
            fileType: selectedFile?.type,
            ...(editMode && editData ? { id: editData.id } : {}),
        });

        onClose();
        setTitle('');
        setCategory('');
        setSelectedFile(null);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <SmartModalHeader T={T} icon={Paperclip} title={editMode ? 'تعديل مستند' : 'محفظة الأدلة الذكية'} onClose={onClose} />
            <div className={T.useMoroccanCorners ? 'p-5 space-y-4' : T.body}>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-sm ${
                        selectedFile
                            ? isPearl
                                ? 'border-[#C9B89A]/40 bg-[#C9B89A]/10 text-[#C9B89A]'
                                : 'border-[#E6C673]/40 bg-[#E6C673]/10 text-[#E6C673]'
                            : isPearl
                              ? 'border-[#C9B89A]/15 bg-[#EDE6D6]/[0.02] text-[#9C9890] hover:border-[#C9B89A]/28 hover:text-[#C9B89A]/90 hover:bg-[#C9B89A]/5'
                              : 'border-white/10 bg-white/[0.02] text-white/40 hover:border-[#E6C673]/30 hover:text-[#E6C673]/80 hover:bg-[#E6C673]/5'
                    }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept="image/*,.pdf"
                        className="hidden"
                    />
                    {selectedFile ? (
                        <>
                            <FileText size={24} className={T.headerIcon} />
                            <span className={`text-xs font-bold truncate max-w-[90%] ${T.accentText}`}>
                                {selectedFile.name}
                            </span>
                        </>
                    ) : (
                        <>
                            <UploadCloud size={24} />
                            <span className="text-xs">اضغط لرفع ملف أو صورة</span>
                        </>
                    )}
                </div>

                <div>
                    <label className={T.label}>
                        نوع المستند <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="مثال: عريضة، وكالة، وصل..."
                        className={T.field}
                    />
                </div>
                <div>
                    <label className={T.label}>
                        اسم المستند <span className="text-red-400">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="مثال: قرار تمييز، عقد بيع..."
                        className={T.field}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!title || !category}
                    className={T.btn}
                >
                    {editMode ? 'تحديث المستند' : 'حفظ المستند'}
                </button>
            </div>
        </MoroccanGlassShell>
    );
};


export const AddNoteModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddNoteModalProps) => {
    const T = useSmartFileModalTheme();
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setDetails(editData.details || '');
            setSelectedTags(
                (editData.tags || [])
                    .map((tag) => normalizeManualClassificationTag(String(tag)))
                    .filter(Boolean),
            );
        } else {
            setTitle('');
            setDetails('');
            setSelectedTags([]);
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        onAdd({
            title,
            details,
            tags: selectedTags,
            ...(editMode && editData ? { id: editData.id } : {}),
        });
        onClose();
        setTitle('');
        setDetails('');
        setSelectedTags([]);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <SmartModalHeader T={T} icon={FileText} title={editMode ? 'تعديل ملاحظة' : 'إضافة ملاحظة'} onClose={onClose} />
            <div className={T.useMoroccanCorners ? 'p-5 space-y-4' : T.body}>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="عنوان الملاحظة"
                            className={T.field}
                            autoFocus
                        />
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={5}
                            className={`${T.field} resize-none min-h-[120px]`}
                            placeholder="اكتب الملاحظة هنا..."
                        />

                        <ManualClassificationPicker
                            mode="multi"
                            selected={selectedTags}
                            onSelectedChange={setSelectedTags}
                            placeholder="مثال: #محضر"
                            inputTestId={CIVIL_LAWSUIT_TEST_IDS.noteTagManualInput}
                            addTestId={CIVIL_LAWSUIT_TEST_IDS.noteTagManualAdd}
                            chipTestId={CIVIL_LAWSUIT_TEST_IDS.noteTagTemplateChip}
                            removeTestId={CIVIL_LAWSUIT_TEST_IDS.noteTagTemplateRemove}
                        />

                        <button type="button" onClick={handleSubmit} className={T.btn}>
                            {editMode ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
                        </button>
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
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
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


export const AddAppointmentModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddAppointmentModalProps) => {
    const T = useSmartFileModalTheme();
    const [date, setDate] = useState('');
    const [details, setDetails] = useState('');
    const [purpose, setPurpose] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);

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
            setDate('');
            setDetails('');
            setPurpose('');
            setSelectedTags([]);
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        const trimmedPurpose = purpose.trim();
        if (!date || !trimmedPurpose) return;
        onAdd({
            title: trimmedPurpose,
            date,
            details,
            purpose: trimmedPurpose,
            ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
            ...(editMode && editData ? { id: editData.id } : {}),
        });
        onClose();
        setDate('');
        setDetails('');
        setPurpose('');
        setSelectedTags([]);
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell onOverlayClick={onClose}>
            <SmartModalHeader T={T} icon={Calendar} title={editMode ? 'تعديل موعد' : 'موعد جديد'} onClose={onClose} />
            <div className={T.useMoroccanCorners ? 'p-5 space-y-4' : T.body}>
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

                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className={T.field}
                        />
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            rows={3}
                            placeholder="ملاحظات إضافية..."
                            className={`${T.field} resize-none min-h-[88px]`}
                        />

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
                            disabled={!date || !purpose.trim()}
                            className={T.btn}
                        >
                            {editMode ? 'تحديث الموعد' : 'حفظ الموعد'}
                        </button>
            </div>
        </MoroccanGlassShell>
    );
};

