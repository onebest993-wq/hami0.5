import React, { useState } from 'react';
import { X, CheckSquare, Paperclip, UploadCloud, FileText, DollarSign, Shield, Calendar, PauseCircle, Gavel, RotateCcw, Trash2, Search, Edit2, Users, Scale, Check, Plus, ArrowRightLeft, Lock, MessageCircle, AlertTriangle } from 'lucide-react';
import { DocumentCategory, IncidentalType, TimelineEvent, getLegalRole } from '../LawyerShared';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { CIVIL_LAWSUIT_TEST_IDS } from './smartFile/civilLawsuitTestIds';
import type {
    AddActionModalProps,
    AddAppointmentModalProps,
    AddDocumentModalProps,
    AddIncidentalCaseModalProps,
    AddNoteModalProps,
    AddPaymentModalProps,
    AddProvisionalOrderModalProps,
    AddTaskModalProps,
    AppealRegistrationModalProps,
    EditCaseInfoModalProps,
    ExtraordinaryAppealModalProps,
    InterlocutoryAppealModalProps,
    InterruptionModalProps,
    JudicialNotificationModalProps,
    ObjectionJudgmentModalProps,
    ObjectionRegistrationModalProps,
    PauseCaseModalProps,
    ResumeInterruptionModalProps,
    TransitionModalProps,
} from './smartFile/modalFormTypes';

export const getLegalRoleTitle = (baseRole: string, count: number) => {
    if (!baseRole) return "الطرف";
    const r = baseRole.trim();
    if (count <= 1) return r;

    if (count === 2) { // DUAL (المثنى)
        if (r.includes("مدعى عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("مستأنف عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("معترض عليه")) return r.replace("عليه", "عليهما");
        if (r.includes("مميز عليه")) return r.replace("عليه", "عليهما");
        if (r === "مدعي" || r === "المدعي") return "المدعيان";
        if (r === "مستأنف" || r === "المستأنف") return "المستأنفان";
        if (r === "معترض" || r === "المعترض") return "المعترضان";
        if (r === "مميز" || r === "المميز") return "المميزان";
        if (r.includes("شخص ثالث")) return "شخصان ثالثان";
        if (r.includes("طالب تدخل")) return "طالبا تدخل";
        return r + "ان"; // Default fallback
    }

    if (count >= 3) { // PLURAL (الجمع)
        if (r.includes("مدعى عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("مستأنف عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("معترض عليه")) return r.replace("عليه", "عليهم");
        if (r.includes("مميز عليه")) return r.replace("عليه", "عليهم");
        if (r === "مدعي" || r === "المدعي") return "المدعون";
        if (r === "مستأنف" || r === "المستأنف") return "المستأنفون";
        if (r === "معترض" || r === "المعترض") return "المعترضون";
        if (r === "مميز" || r === "المميز") return "المميزون";
        if (r.includes("شخص ثالث")) return "أشخاص ثالثة";
        if (r.includes("طالب تدخل")) return "طالبو تدخل";
        return r + "ون"; // Default fallback
    }
};

export const ExtraordinaryAppealModal = ({ isOpen, onClose, onConfirm, type, currentCourt }: ExtraordinaryAppealModalProps) => {
    const [appealDate, setAppealDate] = useState(getLocalTodayYmd());
    const [targetCourt, setTargetCourt] = useState(currentCourt || '');
    const [reasons, setReasons] = useState('');

    const handleSubmit = () => {
        onConfirm({
            type,
            date: appealDate,
            court: targetCourt,
            reasons
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-red-600 to-rose-600 p-4 text-white flex justify-between items-center shadow-lg">
                    <h3 className="font-bold flex items-center gap-2 text-sm">
                        <Scale size={18}/> 
                        تسجيل طعن استثنائي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className={`border rounded-lg p-3 text-xs font-bold flex items-center gap-2 ${
                        type === 'رد القاضي' 
                            ? 'bg-purple-500/10 border-purple-500/20 text-purple-200' 
                            : 'bg-red-500/10 border-red-500/20 text-red-200'
                    }`}>
                        <AlertTriangle size={16} className={type === 'رد القاضي' ? 'text-purple-500' : 'text-red-500'} />
                        {type === 'رد القاضي' 
                            ? 'سيتم تجميد الدعوى فوراً حتى البت في طلب رد القاضي.' 
                            : 'سيتم تغيير حالة الدعوى وتجميد الإجراءات العادية.'}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            {type === 'رد القاضي' ? 'نوع الطلب (تلقائي)' : 'نوع الطعن (تلقائي)'}
                        </label>
                        <input type="text" value={type} disabled className="w-full bg-[#0F172A]/50 border border-white/5 rounded-lg p-3 text-sm text-white/50 cursor-not-allowed font-bold" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ تقديم الطلب <span className="text-red-500">*</span></label>
                        <input type="date" value={appealDate} onChange={e => setAppealDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 [color-scheme:dark]" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">المحكمة المقدم إليها الطلب <span className="text-red-500">*</span></label>
                        <input type="text" value={targetCourt} onChange={e => setTargetCourt(e.target.value)} placeholder={type === 'رد القاضي' ? 'مثال: رئيس المحكمة المختصة' : 'مثال: محكمة التمييز الاتحادية'} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            {type === 'رد القاضي' ? 'أسباب الرد <span className="text-red-500">*</span>' : 'أسباب الطعن / ملاحظات'}
                        </label>
                        <textarea value={reasons} onChange={e => setReasons(e.target.value)} placeholder={type === 'رد القاضي' ? 'اذكر أسباب طلب رد القاضي (مثال: قرابة، مصلحة شخصية...)' : 'اذكر باختصار الأسباب القانونية للطعن...'} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-red-500 min-h-[80px]" />
                    </div>

                    <button onClick={handleSubmit} disabled={!targetCourt} className={`w-full text-white py-3 rounded-lg font-bold text-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${
                        type === 'رد القاضي'
                            ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 shadow-purple-500/20'
                            : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20'
                    }`}>
                        <Shield size={16} />
                        {type === 'رد القاضي' ? 'تأكيد تسجيل طلب رد القاضي' : 'تأكيد تسجيل الطعن'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AddTaskModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddTaskModalProps) => {
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
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div
                data-testid={CIVIL_LAWSUIT_TEST_IDS.taskModal}
                className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
            >
                <div className="bg-blue-500 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <CheckSquare size={18}/> 
                        {editMode ? 'تحديث مهمة إدارية' : 'إضافة مهمة إدارية'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">عنوان المهمة <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            data-testid={CIVIL_LAWSUIT_TEST_IDS.taskTitle}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="مثال: سحب قيد عقار..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500"
                            autoFocus
                        />
                    </div>
                 
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ الإنجاز (اختياري)</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 [color-scheme:dark]" />
                    </div>
                    <button
                        type="button"
                        data-testid={CIVIL_LAWSUIT_TEST_IDS.taskSubmit}
                        onClick={handleSubmit}
                        disabled={!title}
                        className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editMode ? 'تحديث البيانات' : 'حفظ المهمة'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AddDocumentModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddDocumentModalProps) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [evidentiaryWeight, setEvidentiaryWeight] = useState<'official' | 'ordinary' | 'beginning' | 'other' | 'none'>('other'); // 🔥 NEW
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Pre-fill fields in edit mode
    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setCategory(editData.category || editData.docCategory || '');
            setEvidentiaryWeight(editData.evidentiaryWeight || 'other');
            setSelectedFile(null); // Reset file on edit for now
        } else {
            setTitle('');
            setCategory('');
            setEvidentiaryWeight('other');
            setSelectedFile(null);
        }
    }, [editMode, editData]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
            // Auto-fill title if empty
            if (!title) {
                setTitle(e.target.files[0].name.split('.')[0]);
            }
        }
    };

    const handleSubmit = () => {
        if (!title || !category) return;
        
        // In a real app, we would upload the file here.
        // For now, we simulate saving the file data.
        onAdd({ 
            title, 
            category, 
            details: `نوع المستند: ${category}`, 
            fileName: selectedFile?.name,
            fileType: selectedFile?.type,
            evidentiaryWeight, // 🔥 NEW
            ...(editMode && editData ? { id: editData.id } : {}) 
        });
        
        onClose();
        setTitle('');
        setCategory('');
        setEvidentiaryWeight('other');
        setSelectedFile(null);
    };

    // Helper for Legal Warnings
    const getEvidentiaryWarning = (weight: string) => {
        switch (weight) {
            case 'official':
                return {
                    text: '🏛️ حجة قاطعة على الكافة - لا يطعن فيه إلا بادعاء التزوير (المادة 22).',
                    style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                };
            case 'ordinary':
                return {
                    text: '⚠️ قابل للإنكار (خط، إمضاء، بصمة) - كن مستعداً لطلب المضاهاة (المادة 25).',
                    style: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                };
            case 'beginning':
                return {
                    text: '💡 يتيح لك إثبات التصرف بشهادة الشهود استثناءً (المادة 78).',
                    style: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
                };
            default:
                return null;
        }
    };

    if (!isOpen) return null;

    const warning = getEvidentiaryWarning(evidentiaryWeight);

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Paperclip size={18}/> 
                        {editMode ? 'تعديل مستند' : 'محفظة الأدلة الذكية'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full h-24 border-2 border-dashed ${selectedFile ? 'border-purple-500 bg-purple-500/10' : 'border-white/10'} rounded-xl flex flex-col items-center justify-center gap-2 text-white/40 hover:border-purple-500 hover:text-purple-500 hover:bg-purple-500/5 transition-all cursor-pointer`}
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
                                <FileText size={24} className="text-purple-400" />
                                <span className="text-xs text-purple-300 font-bold truncate max-w-[90%]">{selectedFile.name}</span>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={24} />
                                <span className="text-xs">اضغط لرفع ملف أو صورة</span>
                            </>
                        )}
                    </div>

                    {/* 🔥 NEW: Evidentiary Weight Dropdown */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">التكييف القانوني للمستند (القوة الثبوتية) <span className="text-red-500">*</span></label>
                        <select 
                            value={evidentiaryWeight} 
                            onChange={(e) => setEvidentiaryWeight(e.target.value as 'official' | 'ordinary' | 'beginning' | 'none')} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500"
                        >
                            <option value="other">ورقة أخرى (Other)</option>
                            <option value="official">سند رسمي (Official)</option>
                            <option value="ordinary">سند عادي (Ordinary)</option>
                            <option value="beginning">مبدأ ثبوت بالكتابة (Beginning of Proof)</option>
                        </select>
                    </div>

                    {/* 🔥 NEW: Dynamic Legal Warning */}
                    {warning && (
                        <div className={`p-3 rounded-lg border text-[10px] font-bold leading-relaxed flex items-start gap-2 ${warning.style}`}>
                            <span>{warning.text}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">نوع المستند <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            value={category} 
                            onChange={(e) => setCategory(e.target.value)} 
                            placeholder="مثال: عريضة، وكالة، وصل..." 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">اسم المستند <span className="text-red-500">*</span></label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: قرار تمييز، عقد بيع..." className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-purple-500" />
                    </div>
                    <button type="button" onClick={handleSubmit} disabled={!title || !category} className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-purple-700 transition-all shadow-lg shadow-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                        {editMode ? 'تحديث المستند' : 'حفظ المستند'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AddNoteModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddNoteModalProps) => {
    const [title, setTitle] = useState('');
    const [details, setDetails] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]); // 🔥 NEW: Tags State

    // Pre-fill fields in edit mode
    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setDetails(editData.details || '');
            setSelectedTags(editData.tags || []);
        } else {
            setTitle('');
            setDetails('');
            setSelectedTags([]);
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        onAdd({ title, details, tags: selectedTags, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
        setTitle(''); 
        setDetails('');
        setSelectedTags([]);
    };

    const toggleTag = (tag: string) => {
        if (selectedTags.includes(tag)) {
            setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
            setSelectedTags([...selectedTags, tag]);
        }
    };

    const EVIDENCE_TAGS = ['#شهود', '#خبير', '#يمين', '#سندات', '#عام', '#استئخار'];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="bg-amber-500 p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <FileText size={18}/> 
                        {editMode ? 'تعديل ملاحظة' : 'إضافة ملاحظة'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الملاحظة" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" autoFocus />
                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={5} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" placeholder="اكتب الملاحظة هنا..." />
                    
                    {/* 🔥 NEW: Evidence Tags */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-2">تصنيف الملاحظة (أدلة الإثبات)</label>
                        <div className="flex flex-wrap gap-2">
                            {EVIDENCE_TAGS.map(tag => (
                                <button type="button" 
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                        selectedTags.includes(tag) 
                                            ? 'bg-amber-500 text-[#0F172A] shadow-[0_0_10px_rgba(245,158,11,0.4)]' 
                                            : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="button" onClick={handleSubmit} className="w-full bg-amber-500 text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20">
                        {editMode ? 'تحديث الملاحظة' : 'حفظ الملاحظة'}
                    </button>
                </div>
            </div>
        </div>
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

export const AddIncidentalCaseModal = ({ isOpen, onClose, onAdd, currentStage, editMode = false, editData }: AddIncidentalCaseModalProps) => {
    const [type, setType] = useState<string>('joined');
    const [partyName, setPartyName] = useState('');
    const [details, setDetails] = useState('');

    const stageLabel =
        typeof currentStage === 'string'
            ? currentStage
            : (currentStage?.stageName || currentStage?.name || '');
    const isAppeal = stageLabel.includes('استئناف') || stageLabel.includes('Appeal');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setType(editData.type || (isAppeal ? 'joinder_appeal' : 'joined'));
                setPartyName(editData.partyName || '');
                setDetails(editData.details || '');
            } else {
                setType(isAppeal ? 'joinder_appeal' : 'joined');
                setPartyName('');
                setDetails('');
            }
        }
    }, [isOpen, isAppeal, editMode, editData]);

    const handleSubmit = () => {
        if (!partyName) return;
        onAdd({ type, partyName, details, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
             <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className={`p-4 text-white flex justify-between items-center ${isAppeal ? 'bg-indigo-600' : 'bg-red-500'}`}>
                    <h3 className="font-bold flex items-center gap-2">
                        <Shield size={18}/> 
                        {editMode 
                            ? (isAppeal ? 'تحديث شخص ثالث' : 'تحديث دعوى حادثة') 
                            : (isAppeal ? 'إضافة شخص ثالث (استئناف)' : 'إجراء دعوى حادثة')
                        }
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الإجراء</label>
                        <select value={type} onChange={e => setType(e.target.value)} className={`w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none ${isAppeal ? 'focus:border-indigo-600' : 'focus:border-red-500'}`}>
                            {isAppeal ? (
                                <>
                                    <option value="joinder_appeal">دخول اختصامي</option>
                                    {/* Cross Appeal moved to main UI */}
                                </>
                            ) : (
                                <>
                                    <option value="joined">دعوى منضمة</option>
                                    <option value="counter">دعوى متقابلة</option>
                                    <option value="thirdParty">دخول شخص ثالث</option>
                                </>
                            )}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">اسم الخصم / الطرف الثالث</label>
                        <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} placeholder="الاسم الكامل" className={`w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none ${isAppeal ? 'focus:border-indigo-600' : 'focus:border-red-500'}`} />
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">التفاصيل</label>
                        <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="شرح مختصر..." className={`w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none ${isAppeal ? 'focus:border-indigo-600' : 'focus:border-red-500'}`} />
                    </div>
                    <button type="button" onClick={handleSubmit} disabled={!partyName} className={`w-full text-white py-3 rounded-lg font-bold text-sm transition-all shadow-lg disabled:opacity-50 ${isAppeal ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}>
                        {editMode ? 'تحديث البيانات' : 'إضافة'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AddAppointmentModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddAppointmentModalProps) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [details, setDetails] = useState('');
    const [purpose, setPurpose] = useState('مرافعة اعتيادية'); // 🔥 NEW: Purpose Dropdown

    // Pre-fill fields in edit mode
    React.useEffect(() => {
        if (editMode && editData) {
            setTitle(editData.title || '');
            setDate(editData.date || '');
            setDetails(editData.details || '');
            setPurpose(editData.purpose || 'مرافعة اعتيادية');
        } else {
            setTitle('');
            setDate('');
            setDetails('');
            setPurpose('مرافعة اعتيادية');
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        if (!title || !date) return;
        onAdd({ title, date, details, purpose, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
        setTitle(''); 
        setDate(''); 
        setDetails('');
        setPurpose('مرافعة اعتيادية');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
             <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Calendar size={18}/> 
                        {editMode ? 'تعديل موعد' : 'موعد جديد'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                    {/* 🔥 NEW: Purpose Selection */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">الغاية من الجلسة <span className="text-red-500">*</span></label>
                        <select 
                            value={purpose} 
                            onChange={e => setPurpose(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600"
                        >
                            <option value="مرافعة اعتيادية">مرافعة اعتيادية</option>
                            <option value="انتخاب خبير / كشف">انتخاب خبير / كشف</option>
                            <option value="استماع شهود">استماع شهود</option>
                            <option value="تأدية يمين">تأدية يمين</option>
                        </select>
                    </div>

                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الموعد (جلسة مرافعة، مشاهدة...)" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600 [color-scheme:dark]" />
                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="ملاحظات إضافية..." className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-600" />
                    
                    {/* Helper Text based on selection */}
                    {(purpose === 'انتخاب خبير / كشف' || purpose === 'استماع شهود') && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 flex items-start gap-2">
                            <span className="text-blue-400 text-xs">💡</span>
                            <p className="text-blue-200 text-[10px] leading-relaxed">
                                سيقوم النظام تلقائياً بإضافة مهمة تذكير لتسديد النفقات/الأمانة قبل الموعد.
                            </p>
                        </div>
                    )}

                    <button type="button" onClick={handleSubmit} disabled={!title || !date} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50">
                        {editMode ? 'تحديث الموعد' : 'حفظ الموعد'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PauseCaseModal = ({ isOpen, onClose, onConfirm, editMode = false, editData }: PauseCaseModalProps) => {
    const [reason, setReason] = useState('');
    const [linkedCaseNo, setLinkedCaseNo] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setReason(editData.reason || '');
                setLinkedCaseNo(editData.linkedCaseNo || '');
            } else {
                setReason('');
                setLinkedCaseNo('');
            }
        }
    }, [isOpen, editMode, editData]);

    const handleSubmit = () => {
        if (!reason || !linkedCaseNo) return;
        onConfirm({ reason, linkedCaseNo, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-yellow-600 to-amber-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <PauseCircle size={18}/> 
                        {editMode ? 'تحديث استئخار الدعوى' : 'استئخار الدعوى (ربط ذكي) ⏸️'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-yellow-400 text-sm">ℹ️</span>
                        <p className="text-yellow-200 text-xs leading-relaxed">
                            سيتم تجميد الدعوى الحالية مؤقتاً وربطها بدعوى أخرى. 
                            سيظهر الربط تلقائياً في السجل الزمني مع إمكانية التتبع.
                        </p>
                    </div>

                    {/* رقم الدعوى المرتبطة - CRITICAL FIELD */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            رقم الدعوى المرتبطة (التي تم الاستئخار من أجلها) <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={linkedCaseNo} 
                            onChange={e => setLinkedCaseNo(e.target.value)} 
                            placeholder="مثال: 456/م/2026"
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-yellow-500 text-right" 
                            dir="ltr"
                            autoFocus
                        />
                        <p className="text-white/40 text-[10px] mt-1 pr-2">
                            💡 سيتم حفظ الارتباط بين الدعويين تلقائياً
                        </p>
                    </div>

                    {/* سبب الاستئخار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            سبب الاستئخار <span className="text-red-500">*</span>
                        </label>
                        <textarea 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            rows={3} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-yellow-500" 
                            placeholder="مثال: لغرض التدقيق، انتظار نتيجة دعوى الحكم بصحة العقد..."
                        />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!reason || !linkedCaseNo} 
                        className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-white py-3 rounded-lg font-bold text-sm hover:from-yellow-600 hover:to-amber-600 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editMode ? 'تحديث البيانات' : 'تأكيد وربط الدعوى ⏸️'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const InterruptionModal = ({ isOpen, onClose, onConfirm, currentParties = [], editMode = false, editData }: InterruptionModalProps) => {
    const [reason, setReason] = useState('');
    const [affectedParty, setAffectedParty] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());
    const [notes, setNotes] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            if (editMode && editData) {
                setReason(editData.reason || '');
                setAffectedParty(editData.affectedParty || '');
                setDate(editData.date || getLocalTodayYmd());
                setNotes(editData.notes || '');
            } else {
                setReason('');
                setAffectedParty('');
                setDate(getLocalTodayYmd());
                setNotes('');
            }
        }
    }, [isOpen, editMode, editData]);

    const handleSubmit = () => {
        if (!reason || !affectedParty || !date) return;
        onConfirm({ reason, affectedParty, date, notes, ...(editMode && editData ? { id: editData.id } : {}) });
        onClose();
    };

    if (!isOpen) return null;

    const LEGAL_REASONS = [
        'وفاة أحد الخصوم',
        'فقدان أهلية الخصومة',
        'زوال صفة الممثل القانوني'
    ];

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-rose-600 to-red-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        {editMode ? 'تحديث انقطاع السير' : '🛑 انقطاع السير في الدعوى (المادة 84)'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-rose-400 text-sm">⚠️</span>
                        <p className="text-rose-200 text-xs leading-relaxed">
                            سيتم وقف الدعوى <strong>بحكم القانون</strong> فوراً. 
                            تطبيقاً للمادة 84 من قانون المرافعات المدنية، لا يمكن السير في الدعوى حتى إعلان الخصم الجديد.
                        </p>
                    </div>

                    {/* السبب القانوني */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            السبب القانوني <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                            autoFocus
                        >
                            <option value="">-- اختر السبب --</option>
                            {LEGAL_REASONS.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* الخصم المعني */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            الخصم المعني <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={affectedParty} 
                            onChange={e => setAffectedParty(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                        >
                            <option value="">-- اختر الخصم --</option>
                            {currentParties.map((party: any, idx: number) => (
                                <option key={idx} value={party.name}>
                                    {party.name} ({party.role || 'طرف'})
                                </option>
                            ))}
                        </select>
                        <p className="text-white/40 text-[10px] mt-1 pr-2">
                            💡 حدد الطرف الذي حدث له السبب القانوني
                        </p>
                    </div>

                    {/* تاريخ الواقعة */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ الواقعة <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 [color-scheme:dark]" 
                        />
                    </div>

                    {/* ملاحظات */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            ملاحظات (اختياري)
                        </label>
                        <textarea 
                            value={notes} 
                            onChange={e => setNotes(e.target.value)} 
                            rows={3} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            placeholder="مثال: إدخال الورثة، تعيين قيم جديد، تقديم طلب استبدال..."
                        />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!reason || !affectedParty || !date} 
                        className="w-full bg-gradient-to-r from-rose-500 to-red-500 text-white py-3 rounded-lg font-bold text-sm hover:from-rose-600 hover:to-red-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {editMode ? 'تحديث البيانات' : 'تأكيد الانقطاع وتجميد الدعوى 🛑'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ResumeInterruptionModal = ({ isOpen, onClose, onConfirm }: ResumeInterruptionModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <RotateCcw size={18} />
                        استئناف السير في الدعوى
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                
                <div className="p-6 space-y-4 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Check size={32} className="text-green-500" />
                    </div>
                    
                    <h4 className="text-white font-bold text-lg">هل تم زوال السبب؟</h4>
                    <p className="text-white/60 text-sm leading-relaxed">
                        هل أنت متأكد من زوال سبب انقطاع السير (مثل تبليغ الورثة أو تعيين ممثل قانوني) والرغبة في استئناف الدعوى؟
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button type="button" 
                            onClick={onClose}
                            className="w-full bg-[#0F172A] text-white/70 py-3 rounded-lg font-bold text-sm hover:bg-white/5 transition-all border border-white/10"
                        >
                            إلغاء
                        </button>
                        <button type="button" 
                            onClick={() => { onConfirm(); onClose(); }}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold text-sm hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20"
                        >
                            نعم، استئناف السير
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const TransitionModal = ({ isOpen, onClose, onConfirm, nextStageName, currentParties = [] }: TransitionModalProps) => {
    const [newStage, setNewStage] = useState('');
    const [newCourt, setNewCourt] = useState('');
    const [newCaseNo, setNewCaseNo] = useState('');
    const [appellant, setAppellant] = useState(''); // من هو مقدم الطعن
    const [result, setResult] = useState(''); // منطوق القرار
    const [date, setDate] = useState(getLocalTodayYmd());

    React.useEffect(() => {
        if (isOpen) {
            // Reset on open
            setNewStage('');
            setNewCourt('');
            setNewCaseNo('');
            setAppellant('');
            setResult('');
            setDate(getLocalTodayYmd());
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!newStage || !newCourt || !newCaseNo || !appellant || !result) return;
        
        onConfirm({
            newStage,
            newCourt,
            newCaseNo,
            appellant,
            result,
            date
        });
        
        onClose();
    };

    if (!isOpen) return null;

    // Extract party names for the appellant dropdown
    const party1 = currentParties[0] || { name: 'الطرف الأول' };
    const party2 = currentParties[1] || { name: 'الطرف الثاني' };

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="bg-gradient-to-r from-[#E6C673] to-[#F4D03F] p-4 text-[#0F172A] flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Gavel size={18}/> الانتقال لمرحلة تقاضي جديدة
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <p className="text-white/80 text-sm border-r-4 border-[#E6C673] pr-3">
                        سيتم أرشفة المرحلة الحالية بالكامل (المحكمة، القاضي، الأطراف، جميع الإجراءات). 
                        وسيتم إنشاء ملف جديد للمرحلة القادمة مع تحديث المراكز القانونية تلقائياً.
                    </p>

                    {/* منطوق القرار للمرحلة الحالية */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            منطوق قرار المحكمة (للمرحلة الحالية) <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={result} 
                            onChange={e => setResult(e.target.value)} 
                            placeholder="مثال: الحكم لصالح المدعي / رفض الدعوى / الإحالة..."
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" 
                        />
                    </div>

                    {/* تاريخ القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ صدور القرار</label>
                        <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] [color-scheme:dark]" 
                        />
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <p className="text-white/60 text-xs mb-3 font-bold uppercase tracking-wide">بيانات المرحلة الجديدة</p>
                        
                        {/* المرحلة الجديدة */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                المرحلة الجديدة <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={newStage} 
                                onChange={e => setNewStage(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]"
                            >
                                <option value="">اختر المرحلة...</option>
                                <option value="الاستئناف">الاستئناف</option>
                                <option value="التمييز">التمييز</option>
                            </select>
                        </div>

                        {/* اسم المحكمة الجديدة */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                اسم المحكمة الجديدة <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={newCourt} 
                                onChange={e => setNewCourt(e.target.value)} 
                                placeholder="مثال: محكمة استئناف بغداد الاتحادية"
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]" 
                            />
                        </div>

                        {/* رقم الدعوى الجديد */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                رقم الدعوى الجديد <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                value={newCaseNo} 
                                onChange={e => setNewCaseNo(e.target.value)} 
                                placeholder="مثال: 123/س/2026"
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673] text-right" 
                                dir="rtl"
                            />
                        </div>

                        {/* من هو مقدم الطعن (Critical Logic) */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-white/60 mb-1.5">
                                من هو مقدم الطعن؟ (المستأنف/المميز) <span className="text-red-500">*</span>
                            </label>
                            <select 
                                value={appellant} 
                                onChange={e => setAppellant(e.target.value)}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]"
                            >
                                <option value="">اختر من قدم الطعن...</option>
                                <option value={party1.name}>{party1.name} (حالياً: {party1.role || 'الطرف الأول'})</option>
                                <option value={party2.name}>{party2.name} (حالياً: {party2.role || 'الطرف الثاني'})</option>
                            </select>
                            <p className="text-white/40 text-[10px] mt-1 pr-2">
                                ⚠️ سيتم تحديث المراكز القانونية تلقائياً (المستأنف/المستأنف عليه)
                            </p>
                        </div>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!newStage || !newCourt || !newCaseNo || !appellant || !result} 
                        className="w-full bg-[#E6C673] text-[#0F172A] py-3 rounded-lg font-bold text-sm hover:bg-[#F4D03F] transition-all shadow-lg shadow-[#E6C673]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        ✅ تأكيد الانتقال وأرشفة المرحلة الحالية
                    </button>
                </div>
            </div>
        </div>
    );
};

export const InterlocutoryAppealModal = ({ isOpen, onClose, onConfirm, editMode = false, editData }: InterlocutoryAppealModalProps) => {
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
        'أخرى (مادة 216)'
    ];

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="bg-indigo-900 border-b border-indigo-500/30 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <RotateCcw size={18} className="text-indigo-300"/> 
                        {editMode ? 'تحديث قرار تمييزي' : 'تمييز قرار إعدادي / مستعجل (مادة 216)'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 flex items-start gap-2">
                        <span className="text-indigo-400 text-sm">ℹ️</span>
                        <p className="text-indigo-200 text-xs leading-relaxed">
                            القرارات الإعدادية (التي لا تحسم الدعوى) تقبل الطعن تمييزاً فقط أمام محكمة الاستئناف بصفتها التمييزية خلال <strong>7 أيام</strong> من تاريخ التبلغ بها أو تفهيمها.
                        </p>
                    </div>

                    {/* نوع القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع القرار المطعون فيه <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={decisionType} 
                            onChange={e => setDecisionType(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500" 
                            dir="rtl"
                            autoFocus
                        >
                            <option value="">-- اختر نوع القرار --</option>
                            {DECISION_TYPES.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* تاريخ القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            تاريخ صدور القرار / التبلغ به <span className="text-red-500">*</span>
                        </label>
                        <input 
                            type="date" 
                            value={decisionDate} 
                            onChange={e => setDecisionDate(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500 [color-scheme:dark]" 
                        />
                    </div>

                    {/* المهلة المحسوبة */}
                    <div className="bg-[#0F172A] border border-indigo-500/30 rounded-lg p-3 flex flex-col items-center justify-center gap-1">
                        <span className="text-[10px] text-white/40">آخر موعد لتقديم الطعن (المهلة القانونية)</span>
                        <div className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                            <Calendar size={16} />
                            {calculatedDeadline}
                            <span className="text-xs text-indigo-400/50">(7 أيام)</span>
                        </div>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!decisionType || !decisionDate} 
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={16} />
                        {editMode ? 'تحديث البيانات' : 'تأكيد وإضافة للتذكيرات'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 🔥 NEW: AddActionModal (Session Record & Stay Logic)
export const AddActionModal = ({ isOpen, onClose, onAdd, editMode = false, editData }: AddActionModalProps) => {
    const [actionType, setActionType] = useState('regular'); // 'regular' | 'incidental'
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(getLocalTodayYmd());
    const [details, setDetails] = useState('');
    const [isStayed, setIsStayed] = useState(false);

    // 🔥 NEW: Litigation Incidents State
    const [litigationIncidentType, setLitigationIncidentType] = useState('');
    const [stayEndDate, setStayEndDate] = useState('');

    // Incidental Fields
    const [incidentalType, setIncidentalType] = useState('plaintiff_claim');
    const [claimSubject, setClaimSubject] = useState('');
    const [feeReceipt, setFeeReceipt] = useState('');
    const [thirdPartyName, setThirdPartyName] = useState('');
    const [thirdPartyRole, setThirdPartyRole] = useState('شخص ثالث منضم للمدعي');

    React.useEffect(() => {
        if (editMode && editData) {
            setActionType('regular'); // Default to regular for edits for now unless we track type
            setTitle(editData.title || '');
            setDate(editData.date || getLocalTodayYmd());
            setDetails(editData.details || '');
            setIsStayed(editData.isStayed || false);
            setLitigationIncidentType('');
            setStayEndDate('');
        } else {
            setActionType('regular');
            setTitle('');
            setDate(getLocalTodayYmd());
            setDetails('');
            setIsStayed(false);
            setIncidentalType('plaintiff_claim');
            setClaimSubject('');
            setFeeReceipt('');
            setThirdPartyName('');
            setThirdPartyRole('شخص ثالث منضم للمدعي');
            setLitigationIncidentType('');
            setStayEndDate('');
        }
    }, [editMode, editData]);

    const handleSubmit = () => {
        if (actionType === 'regular') {
            if (!title || !date) return;
            
            // 🔥 NEW: Handle Litigation Incidents
            if (litigationIncidentType) {
                onAdd({ 
                    type: 'regular',
                    title, 
                    date, 
                    details, 
                    isStayed,
                    litigationIncidentType,
                    stayEndDate: litigationIncidentType === 'الوقف الاتفاقي' ? stayEndDate : undefined,
                    ...(editMode && editData ? { id: editData.id } : {}) 
                });
            } else {
                onAdd({ 
                    type: 'regular',
                    title, 
                    date, 
                    details, 
                    isStayed,
                    ...(editMode && editData ? { id: editData.id } : {}) 
                });
            }
        } else {
            // Incidental Lawsuit Validation
            if (incidentalType !== 'third_party' && (!claimSubject || !feeReceipt)) return;
            if (incidentalType === 'third_party' && (!thirdPartyName || !feeReceipt)) return;

            let finalTitle = '';
            let finalDetails = '';
            
            if (incidentalType === 'plaintiff_claim') {
                finalTitle = 'إقامة دعوى حادثة (طلب عارض)';
                finalDetails = `موضوع الطلب: ${claimSubject}\nرقم وصل الرسم: ${feeReceipt}`;
            } else if (incidentalType === 'defendant_claim') {
                finalTitle = 'إقامة دعوى حادثة (دعوى متقابلة)';
                finalDetails = `موضوع الدعوى المتقابلة: ${claimSubject}\nرقم وصل الرسم: ${feeReceipt}`;
            } else {
                finalTitle = 'إقامة دعوى حادثة (دخول شخص ثالث)';
                finalDetails = `اسم الشخص الثالث: ${thirdPartyName}\nالمركز القانوني: ${thirdPartyRole}\nرقم وصل الرسم: ${feeReceipt}`;
            }

            onAdd({
                type: 'incidental',
                incidentalType,
                title: finalTitle,
                date,
                details: finalDetails,
                claimSubject,
                feeReceipt,
                thirdPartyName,
                thirdPartyRole,
                ...(editMode && editData ? { id: editData.id } : {})
            });
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
             <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl z-[161] flex flex-col max-h-[85vh]">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center shrink-0">
                    <h3 className="font-bold flex items-center gap-2">
                        <Scale size={18}/> 
                        {editMode ? 'تعديل إجراء' : 'إجراء جديد / دعوى حادثة'}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1"><X size={18} /></button>
                </div>
                
                <div className="p-5 overflow-y-auto scrollbar-hide flex-1">
                    <div className="space-y-4">
                        {/* 1. ACTION TYPE SELECTOR */}
                        {!editMode && (
                            <div className="flex gap-2 p-1 bg-black/20 rounded-lg mb-2">
                                <button type="button" 
                                    onClick={() => setActionType('regular')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${actionType === 'regular' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    إجراء اعتيادي
                                </button>
                                <button type="button" 
                                    onClick={() => setActionType('incidental')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${actionType === 'incidental' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                                >
                                    دعوى حادثة
                                </button>
                            </div>
                        )}

                        {actionType === 'regular' ? (
                            <>
                                {/* 🔥 NEW: نوع الإجراء Dropdown */}
                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الإجراء</label>
                                    <select 
                                        value={litigationIncidentType} 
                                        onChange={e => setLitigationIncidentType(e.target.value)}
                                        className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600"
                                    >
                                        <option value="">إجراء اعتيادي</option>
                                        <option value="ترك الدعوى للمراجعة">ترك الدعوى للمراجعة (غياب)</option>
                                        <option value="الوقف الاتفاقي">الوقف الاتفاقي (تأجيل طويل)</option>
                                    </select>
                                </div>

                                {/* 🔥 NEW: Show stayEndDate picker for الوقف الاتفاقي */}
                                {litigationIncidentType === 'الوقف الاتفاقي' && (
                                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-3">
                                        <label className="block text-xs font-bold text-amber-400 mb-1.5">
                                            نهاية مدة الوقف (أقصاها 3 أشهر) <span className="text-red-500">*</span>
                                        </label>
                                        <input 
                                            type="date" 
                                            value={stayEndDate} 
                                            onChange={e => setStayEndDate(e.target.value)} 
                                            className="w-full bg-[#0F172A] border border-amber-500/30 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 [color-scheme:dark]" 
                                        />
                                    </div>
                                )}

                                {/* 🔥 NEW: Warning for ترك الدعوى */}
                                {litigationIncidentType === 'ترك الدعوى للمراجعة' && (
                                    <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3">
                                        <p className="text-rose-400 text-[10px] font-bold leading-relaxed flex items-center gap-2">
                                            <AlertTriangle size={14} />
                                            سيتم تغيير حالة الدعوى إلى "متروكة للمراجعة" وإنشاء تنبيه تلقائي لتجديدها خلال 10 أيام.
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">عنوان الإجراء <span className="text-red-500">*</span></label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان الإجراء (جلسة مرافعة، قرار...)" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600" autoFocus />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ الإجراء <span className="text-red-500">*</span></label>
                                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600 [color-scheme:dark]" />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">تفاصيل الإجراء</label>
                                    <textarea value={details} onChange={e => setDetails(e.target.value)} rows={3} placeholder="تفاصيل الإجراء / محضر الجلسة..." className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600" />
                                </div>
                                
                                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center justify-between mt-4">
                                    <div className="flex items-center gap-2">
                                        <PauseCircle size={18} className={isStayed ? "text-amber-400" : "text-slate-400"} />
                                        <span className={`text-xs font-bold ${isStayed ? "text-amber-400" : "text-slate-400"}`}>
                                            قرار باستئخار الدعوى (تجميد الإجراءات)
                                        </span>
                                    </div>
                                    <div 
                                        onClick={() => setIsStayed(!isStayed)}
                                        className={`w-10 h-6 rounded-full flex items-center px-1 cursor-pointer transition-all ${isStayed ? 'bg-amber-500 justify-end' : 'bg-slate-700 justify-start'}`}
                                    >
                                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                                    </div>
                                </div>
                                {isStayed && (
                                    <p className="text-[10px] text-amber-500/80 pr-2 leading-relaxed">
                                        ⚠️ سيتم تغيير حالة الدعوى إلى "مستأخرة" وتجميد التنبيهات.
                                    </p>
                                )}
                            </>
                        ) : (
                            /* INCIDENTAL LAWSUIT FORM */
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الدعوى الحادثة</label>
                                    <select 
                                        value={incidentalType} 
                                        onChange={e => setIncidentalType(e.target.value)}
                                        className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600"
                                    >
                                        <option value="plaintiff_claim">طلب عارض من المدعي (م 66)</option>
                                        <option value="defendant_claim">دعوى متقابلة من المدعى عليه (م 67)</option>
                                        <option value="third_party">دخول / إدخال شخص ثالث (م 69)</option>
                                    </select>
                                </div>

                                {(incidentalType === 'plaintiff_claim' || incidentalType === 'defendant_claim') && (
                                    <div>
                                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                                            {incidentalType === 'plaintiff_claim' ? 'موضوع الطلب العارض' : 'موضوع الدعوى المتقابلة'} <span className="text-red-500">*</span>
                                        </label>
                                        <input type="text" value={claimSubject} onChange={e => setClaimSubject(e.target.value)} placeholder="اكتب الموضوع..." className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600" />
                                    </div>
                                )}

                                {incidentalType === 'third_party' && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-white/60 mb-1.5">اسم الشخص الثالث <span className="text-red-500">*</span></label>
                                            <input type="text" value={thirdPartyName} onChange={e => setThirdPartyName(e.target.value)} placeholder="الاسم الكامل" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-white/60 mb-1.5">المركز القانوني</label>
                                            <select 
                                                value={thirdPartyRole} 
                                                onChange={e => setThirdPartyRole(e.target.value)}
                                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600"
                                            >
                                                <option value="شخص ثالث منضم للمدعي">شخص ثالث منضم للمدعي</option>
                                                <option value="شخص ثالث منضم للمدعى عليه">شخص ثالث منضم للمدعى عليه</option>
                                                <option value="شخص ثالث يطلب الحكم لنفسه (اختصامي)">شخص ثالث يطلب الحكم لنفسه (اختصامي)</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-white/60 mb-1.5">رقم وصل الرسم وتاريخه <span className="text-red-500">*</span></label>
                                    <input type="text" value={feeReceipt} onChange={e => setFeeReceipt(e.target.value)} placeholder="مثال: 4521 في 2024/2/20" className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-600" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-5 pt-0 shrink-0">
                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={
                            actionType === 'regular' 
                                ? (!title || !date || (litigationIncidentType === 'الوقف الاتفاقي' && !stayEndDate)) 
                                : (incidentalType === 'third_party' ? (!thirdPartyName || !feeReceipt) : (!claimSubject || !feeReceipt))
                        }
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        {editMode ? 'تحديث البيانات' : (actionType === 'regular' ? 'حفظ الإجراء' : 'إقامة الدعوى الحادثة')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// DEDICATED TRASH MODAL - Soft Delete System
export const TrashModal = ({ isOpen, onClose, deletedItems, onRestore, onPermanentDelete, onEmptyTrash }: { 
    isOpen: boolean; 
    onClose: () => void; 
    deletedItems: TimelineEvent[]; 
    onRestore: (id: string) => void; 
    onPermanentDelete: (id: string) => void;
    onEmptyTrash: () => void;
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-red-500/20 border-b border-red-500/30 p-4 flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                        <Trash2 size={18} className="text-red-400" /> 
                        سلة المهملات (المحذوفات)
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-white/10 rounded-full p-1 text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto scrollbar-hide max-h-[60vh]">
                    {deletedItems.length === 0 ? (
                        <div className="text-center py-12">
                            <Trash2 size={48} className="mx-auto text-white/20 mb-3" />
                            <p className="text-white/40 text-sm">سلة المهملات فارغة</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {deletedItems.map(item => (
                                <div 
                                    key={item.id} 
                                    className="bg-[#0F172A] opacity-70 border border-white/5 rounded-xl p-4 hover:opacity-100 transition-opacity"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-white/40">{item.date}</span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${
                                                    item.type === 'appointment' ? 'bg-blue-500/20 text-blue-400' :
                                                    item.type === 'document' ? 'bg-purple-500/20 text-purple-400' :
                                                    item.type === 'note' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-green-500/20 text-green-400'
                                                }`}>
                                                    {item.type === 'appointment' ? 'موعد' :
                                                     item.type === 'document' ? 'مستند' :
                                                     item.type === 'note' ? 'ملاحظة' : 'قرار'}
                                                </span>
                                            </div>
                                            <h4 className="text-white font-bold text-sm mb-1">{item.title}</h4>
                                            {item.details && <p className="text-white/60 text-xs">{item.details}</p>}
                                        </div>

                                        <div className="flex gap-2">
                                            <button type="button"
                                                onClick={() => onRestore(item.id)}
                                                className="p-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 text-green-400 transition-colors"
                                                title="استعادة"
                                            >
                                                <RotateCcw size={16} />
                                            </button>
                                            <button type="button"
                                                onClick={() => onPermanentDelete(item.id)}
                                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                                                title="حذف نهائي"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {deletedItems.length > 0 && (
                    <div className="border-t border-white/5 p-4">
                        <button type="button"
                            onClick={onEmptyTrash}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-3 rounded-lg font-bold text-sm transition-all border border-red-500/20"
                        >
                            إفراغ سلة المهملات (حذف نهائي للكل)
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export const AddProvisionalOrderModal = ({ isOpen, onClose, onConfirm, currentParties = [] }: AddProvisionalOrderModalProps) => {
    const [orderType, setOrderType] = useState('');
    const [targetParty, setTargetParty] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setOrderType('');
            setTargetParty('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!orderType || !targetParty) return;
        onConfirm({ type: orderType, targetParty });
        onClose();
    };

    if (!isOpen) return null;

    const ORDER_TYPES = ['حجز احتياطي', 'منع سفر', 'قضاء مستعجل', 'وضع اليد', 'منع التعرض'];

    // Combine all parties for selection
    const allParties = currentParties.map((p: any) => p.name).filter(Boolean);

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-rose-900/80 border-b border-rose-500/30 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Lock size={18} className="text-rose-400" />
                        إصدار قرار ولائي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/60 hover:text-white transition-colors">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    {/* نوع القرار */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            نوع القرار <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={orderType} 
                            onChange={e => setOrderType(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                            autoFocus
                        >
                            <option value="">-- اختر نوع القرار --</option>
                            {ORDER_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    {/* الخصم المستهدف */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            الخصم المستهدف <span className="text-red-500">*</span>
                        </label>
                        <select 
                            value={targetParty} 
                            onChange={e => setTargetParty(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            dir="rtl"
                        >
                            <option value="">-- اختر الخصم --</option>
                            {allParties.map((name: string, idx: number) => (
                                <option key={idx} value={name}>{name}</option>
                            ))}
                        </select>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!orderType || !targetParty} 
                        className="w-full bg-rose-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        إصدار القرار 🔒
                    </button>
                </div>
            </div>
        </div>
    );
};

export const EditCaseInfoModal = ({ isOpen, onClose, formData, onSave }: EditCaseInfoModalProps) => {
    const [caseNo, setCaseNo] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [stageName, setStageName] = useState(''); // This acts as baseStage
    const [extraordinaryType, setExtraordinaryType] = useState(''); // New State for Appeal Type
    const [caseType, setCaseType] = useState('');
    const [hasCrossAppeal, setHasCrossAppeal] = useState(false);
    
    // 🎯 CRITICAL: First Instance Data Preservation for Appeal Stage
    const [firstInstanceCaseNumber, setFirstInstanceCaseNumber] = useState('');
    const [firstInstanceCourt, setFirstInstanceCourt] = useState('');
    
    // 🆕 APPEAL DATA
    const [appealCaseNumber, setAppealCaseNumber] = useState('');
    const [appealCourtName, setAppealCourtName] = useState('');
    
    // 🆕 THIRD PARTIES DATA
    const [thirdParties, setThirdParties] = useState<any[]>([]);
    
    // 🆕 Represented Party
    const [representedParty, setRepresentedParty] = useState<string | null>(null);

    const [plaintiffs, setPlaintiffs] = useState<any[]>([]);
    const [defendants, setDefendants] = useState<any[]>([]);

    // 🛡️ AUTO-CALCULATE LEGAL ROLE (based on stage name)
    // calculateLegalRole removed in favor of getLegalRole from LawyerShared

    React.useEffect(() => {
        if (isOpen && formData) {
            setCaseNo(formData.caseNo || '');
            setCourt(formData.court || '');
            setJudge(formData.judge || '');
            setStageName(formData.stageName || 'البداءة');
            setExtraordinaryType(formData.extraordinaryType || '');
            setCaseType(formData.docType || formData.type || '');
            setHasCrossAppeal(formData.hasCrossAppeal || false);
            
            // 🎯 Load preserved First Instance data
            setFirstInstanceCaseNumber(formData.firstInstanceCaseNumber || '');
            setFirstInstanceCourt(formData.firstInstanceCourt || '');
            
            // 🆕 Load Appeal Data
            setAppealCaseNumber(formData.appealCaseNumber || '');
            setAppealCourtName(formData.appealCourtName || '');
            
            // 🆕 Load Third Parties
            setThirdParties(formData.thirdParties || []);
            
            // 🆕 Load Represented Party
            setRepresentedParty(formData.representedParty || null);
            
            // 🛡️ DEEP COPY PARTIES to ensure Local State is disconnected from Parent State
            const allParties = (formData.parties || []).map((p: any) => ({ 
                ...p,
                lawyers: p.lawyers ? p.lawyers.map((l: any) => ({ ...l })) : []
            }));
            
            // Smart Filter
            let pList = allParties.filter((p: any) => p.role === 'plaintiff' || p.role === 'client' || p.side === 'right' || p.role?.includes('المدعي') || p.role?.includes('المستأنف') || p.role?.includes('الطاعن') || p.role?.includes('المعترض') || p.role?.includes('طالب'));
            let dList = allParties.filter((p: any) => p.role === 'defendant' || p.role === 'opponent' || p.side === 'left' || p.role?.includes('المدعى') || p.role?.includes('المستأنف عليه') || p.role?.includes('المطعون') || p.role?.includes('المعترض عليه') || p.role?.includes('المطلوب'));
            
            // Fallback for legacy data (index based)
            if (pList.length === 0 && dList.length === 0) {
                if (allParties.length > 0) pList = [allParties[0]];
                if (allParties.length > 1) dList = allParties.slice(1);
            }

            // Ensure at least one empty field if empty
            if (pList.length === 0) pList = [{ name: '', role: 'plaintiff' }];
            if (dList.length === 0) dList = [{ name: '', role: 'defendant' }];

            setPlaintiffs(pList);
            setDefendants(dList);
        }
    }, [isOpen, formData]);
    
    const handleAddParty = (type: 'plaintiff' | 'defendant') => {
        const activeStage = extraordinaryType || stageName;
        const currentList = type === 'plaintiff' ? plaintiffs : defendants;
        // 🚀 AUTO-INHERIT ROLE: If group has members, new member inherits the first member's role
        const inheritedRole = currentList.length > 0 ? currentList[0].role : (type === 'plaintiff' ? 'مدعي' : 'مدعى عليه');

        const newParty = { 
            name: '', 
            address: '', 
            phone: '',
            lawyerName: '',
            lawyerPhone: '',
            lawyers: [{ name: '', phone: '' }],
            // 🆕 New Lawyer Structure
            lawyer: { name: '', phone: '', isMyOffice: false }, 
            role: inheritedRole,
            legalRole: getLegalRole(activeStage, type === 'plaintiff' ? 1 : 2, 1)
        };
        if (type === 'plaintiff') setPlaintiffs([...plaintiffs, newParty]);
        else setDefendants([...defendants, newParty]);
    };

    const handleRemoveParty = (type: 'plaintiff' | 'defendant', index: number) => {
        if (type === 'plaintiff') {
            if (plaintiffs.length <= 1) return; // Prevent deleting last one
            setPlaintiffs(plaintiffs.filter((_, i) => i !== index));
        } else {
            if (defendants.length <= 1) return; // Prevent deleting last one
            setDefendants(defendants.filter((_, i) => i !== index));
        }
    };

    const handleUpdateParty = (type: 'plaintiff' | 'defendant', index: number, field: string, value: any) => {
        const list = type === 'plaintiff' ? plaintiffs : defendants;
        const setter = type === 'plaintiff' ? setPlaintiffs : setDefendants;
        
        // 🛡️ IMMUTABLE UPDATE PATTERN
        let newList = list.map((item, i) => {
            if (i !== index) return item;
            
            const newItem = { ...item };
            
            // Handle Legacy Lawyer Fields
            if (field === 'lawyerName' || field === 'lawyerPhone') {
                 const currentLawyer = newItem.lawyers?.[0] || { name: '', phone: '' };
                 const newLawyer = { ...currentLawyer };
                 
                 if (field === 'lawyerName') newLawyer.name = value;
                 if (field === 'lawyerPhone') newLawyer.phone = value;
                 
                 newItem.lawyers = [newLawyer];
                 newItem[field] = value; 
                 
                 // Sync with new structure
                 if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
                 if (field === 'lawyerName') newItem.lawyer.name = value;
                 if (field === 'lawyerPhone') newItem.lawyer.phone = value;
            } 
            // Handle New Lawyer Structure
            else if (field.startsWith('lawyer.')) {
                if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
                
                const key = field.split('.')[1]; // name, phone, or isMyOffice
                
                // 🛑 Conflict of Interest Check
                if (key === 'isMyOffice' && value === true) {
                    // Check if opposing side has "My Office" checked
                    const opposingList = type === 'plaintiff' ? defendants : plaintiffs;
                    const hasConflict = opposingList.some(p => p.lawyer?.isMyOffice || p.isClient);
                    
                    if (hasConflict) {
                        SmartToast.error("⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!");
                        return item; // Abort update
                    }
                    
                    // Auto-mark as client
                    newItem.isClient = true;
                    
                    // 🛡️ Set Represented Party
                    setRepresentedParty(type === 'plaintiff' ? 'المدعي' : 'المدعى عليه');
                } else if (key === 'isMyOffice' && value === false) {
                     // If unchecking, and this was the only client, should we set representedParty to null?
                     // Let's check if there are any other clients for this side.
                     // But for now, just unset isClient.
                     newItem.isClient = false;
                     // We don't unset representedParty here because another party on the same side might still be client.
                     // But if we want perfect sync, we can re-evaluate on save.
                }
                
                newItem.lawyer = { ...newItem.lawyer, [key]: value };
                
                // Sync legacy fields
                if (key === 'name') {
                    newItem.lawyerName = value;
                    if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                    newItem.lawyers[0].name = value;
                }
                if (key === 'phone') {
                    newItem.lawyerPhone = value;
                    if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                    newItem.lawyers[0].phone = value;
                }
            }
            else {
                 newItem[field] = value;
            }
            return newItem;
        });
        
        // 🚀 AUTO-SYNC LOGIC: If updating role of first party, update EVERYONE in the group
        if (index === 0 && field === 'role') {
            newList = newList.map(p => ({ ...p, role: value }));
        }
        
        setter(newList);
    };

    const handleSubmit = () => {
        // Ensure roles are updated based on current stage (Extraordinary appeal overrides base stage)
        const activeStage = extraordinaryType || stageName;
        
        const updatedPlaintiffs = plaintiffs.map(p => ({ ...p, role: 'plaintiff', legalRole: getLegalRole(activeStage, 1, 1) }));
        const updatedDefendants = defendants.map(p => ({ ...p, role: 'defendant', legalRole: getLegalRole(activeStage, 2, 1) }));

        const allParties = [...updatedPlaintiffs, ...updatedDefendants];

        // 🎯 CRITICAL LEGAL LOGIC: Preserve First Instance data when in Appeal stage
        const saveData: any = {
            caseNo,
            court,
            judge,
            stageName,
            extraordinaryType, // Save new separate variable
            type: caseType,
            parties: allParties,
            thirdParties: thirdParties, // 🆕 Include Third Parties
            hasCrossAppeal: hasCrossAppeal,
            representedParty: representedParty, // 🆕 Save Represented Party
            // 🆕 SAVE APPEAL DATA
            appealCaseNumber,
            appealCourtName
        };

        // If in appeal stage, preserve First Instance data
        if (stageName?.includes('استئناف')) {
            saveData.firstInstanceCaseNumber = firstInstanceCaseNumber;
            saveData.firstInstanceCourt = firstInstanceCourt;
        }

        onSave(saveData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl">
                <div className="bg-[#0F172A] border-b border-white/10 p-4 text-[#E6C673] flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold flex items-center gap-2">
                        <Edit2 size={18}/> تعديل بيانات الدعوى الأساسية
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-white/10 rounded-full p-1 text-white/50 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Section 1: Case Identity */}
                    <div className="space-y-4 border-b border-white/5 pb-6">
                        <h4 className="text-[#E6C673] text-sm font-bold flex items-center gap-2">
                            <Scale size={16} /> هوية الدعوى
                        </h4>
                        
                        {/* Stage Selector */}
                        <div>
                            <label className="block text-xs font-bold text-white/60 mb-1.5">المرحلة القانونية الحالية</label>
                            <select 
                                value={stageName} 
                                onChange={e => {
                                    const newStage = e.target.value;
                                    // 🎯 CRITICAL: When switching TO appeal, preserve current data as First Instance
                                    if (newStage.includes('استئناف') && !stageName.includes('استئناف')) {
                                        // Save current data as First Instance before switching
                                        if (!firstInstanceCaseNumber && caseNo) setFirstInstanceCaseNumber(caseNo);
                                        if (!firstInstanceCourt && court) setFirstInstanceCourt(court);
                                    }
                                    setStageName(newStage);
                                }}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500"
                            >
                                <option value="البداءة">البداءة</option>
                                <option value="الاستئناف">الاستئناف</option>
                                <option value="التمييز">التمييز</option>
                                <option value="اعتراض غيابي">اعتراض غيابي</option>
                                <option value="اعتراض الغير">اعتراض الغير</option>
                                <option value="إعادة المحاكمة">إعادة المحاكمة</option>
                                <option value="تصحيح القرار التمييزي">تصحيح القرار التمييزي</option>
                            </select>
                        </div>

                        {/* 🎯 First Instance Data - Shown when in Appeal stage */}
                        {stageName?.includes('استئناف') && (
                            <div className="bg-slate-800/30 border border-slate-600/30 rounded-lg p-4 space-y-3">
                                <h5 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    📋 بيانات مرحلة البداءة (محفوظة)
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">رقم دعوى البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCaseNumber} 
                                            onChange={e => setFirstInstanceCaseNumber(e.target.value)} 
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" 
                                            placeholder="رقم القضية في محكمة البداءة"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">محكمة البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCourt} 
                                            onChange={e => setFirstInstanceCourt(e.target.value)} 
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" 
                                            placeholder="اسم محكمة البداءة"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    {stageName?.includes('استئناف') ? 'رقم دعوى الاستئناف' : 'رقم الدعوى'}
                                </label>
                                <input 
                                    type="text" 
                                    value={caseNo} 
                                    onChange={e => setCaseNo(e.target.value)} 
                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 text-right" 
                                    dir="ltr" 
                                    placeholder={stageName?.includes('استئناف') ? "رقم الاستئناف (مثال: 45/س/2026)" : "مثال: 15/ب/2024"}
                                />
                                <p className="text-white/30 text-[10px] mt-1 text-right">يدعم الأرقام والحروف</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    {stageName?.includes('استئناف') ? 'محكمة الاستئناف' : 'المحكمة المختصة'}
                                </label>
                                <input 
                                    type="text" 
                                    value={court} 
                                    onChange={e => setCourt(e.target.value)} 
                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" 
                                    placeholder={stageName?.includes('استئناف') ? "اسم محكمة الاستئناف" : "اسم المحكمة المختصة"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الدعوى</label>
                                <input type="text" value={caseType} onChange={e => setCaseType(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" placeholder="مثال: دين، أجر مثل..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">اسم القاضي (اختياري)</label>
                                <input type="text" value={judge} onChange={e => setJudge(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Parties */}
                    <div className="space-y-6">
                        <h4 className="text-[#E6C673] text-sm font-bold flex items-center gap-2">
                            <Users size={16} /> أطراف الدعوى
                        </h4>
                        
                        {/* Party 1 List (Plaintiffs) */}
                        <div className="bg-transparent rounded-xl p-5 border border-slate-500/30">
                            
                            {/* Legal Role Label - DYNAMIC GRAMMAR */}
                            {plaintiffs.length > 0 && (
                                <div className="flex justify-center w-full mb-6 mt-4">
                                  <span className="text-3xl font-extrabold text-[#E6C673] drop-shadow-md tracking-wider">
                                    {getLegalRoleTitle(plaintiffs[0].role, plaintiffs.length)}
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {plaintiffs.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('plaintiff', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}
                                        
                                        {/* Editable Role Dropdown */}
                                        {index === 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-amber-400 mb-1">المركز القانوني (الصفة)</label>
                                                <input 
                                                    type="text" 
                                                    value={party.role || ''} 
                                                    onChange={(e) => handleUpdateParty('plaintiff', index, 'role', e.target.value)} 
                                                    placeholder="اكتب الصفة (مثال: مدعي، مستأنف، مميز...)" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">الاسم الكامل {plaintiffs.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('plaintiff', index, 'name', e.target.value)} 
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]/50 focus:ring-1 focus:ring-[#E6C673]/30 transition-all" 
                                                placeholder="أدخل الاسم الكامل" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">رقم الهاتف</label>
                                                <input 
                                                    type="text" 
                                                    value={party.phone || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'phone', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="رقم الهاتف" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">العنوان</label>
                                                <input 
                                                    type="text" 
                                                    value={party.address || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'address', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="العنوان" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Unified Toggles */}
                                        <div className="flex items-center justify-between w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-2">
                                            {/* Toggle 1: Has Lawyer */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!(party.lawyer?.name || party.lawyerName)} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!party.lawyer?.name) handleUpdateParty('plaintiff', index, 'lawyer.name', ' ');
                                                        } else {
                                                            handleUpdateParty('plaintiff', index, 'lawyer.name', '');
                                                            handleUpdateParty('plaintiff', index, 'lawyer.phone', '');
                                                            handleUpdateParty('plaintiff', index, 'lawyer.isMyOffice', false);
                                                        }
                                                    }} 
                                                    className="form-checkbox text-indigo-500 rounded bg-slate-900 border-slate-600 focus:ring-indigo-500 w-4 h-4" 
                                                />
                                                <span className="text-sm font-bold text-slate-300">لديه وكيل (محامي)</span>
                                            </label>

                                            {/* Toggle 2: Is My Client */}
                                            {!!(party.lawyer?.name || party.lawyerName) && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={party.lawyer?.isMyOffice || false} 
                                                        onChange={(e) => handleUpdateParty('plaintiff', index, 'lawyer.isMyOffice', e.target.checked)} 
                                                        className="form-checkbox text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-emerald-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm font-bold text-emerald-400">هذا موكلي</span>
                                                </label>
                                            )}
                                        </div>

                                        {!!(party.lawyer?.name || party.lawyerName) && (
                                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.name || party.lawyerName || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'lawyer.name', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="اسم المحامي / الزميل" 
                                                />
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.phone || party.lawyerPhone || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'lawyer.phone', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="رقم الهاتف" 
                                                    dir="ltr" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <button type="button" 
                                onClick={() => handleAddParty('plaintiff')}
                                className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-xs hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> إضافة طرف آخر (مدعي)
                            </button>
                        </div>

                        {/* Party 2 List (Defendants) */}
                        <div className="bg-transparent rounded-xl p-5 border border-slate-500/30">
                            
                            {/* Legal Role Label - DYNAMIC GRAMMAR */}
                            {defendants.length > 0 && (
                                <div className="flex justify-center w-full mb-6 mt-4">
                                  <span className="text-3xl font-extrabold text-amber-400 drop-shadow-md tracking-wider">
                                    {getLegalRoleTitle(defendants[0].role, defendants.length)} 
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {defendants.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('defendant', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}

                                        {/* Editable Role Dropdown */}
                                        {index === 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-amber-400 mb-1">المركز القانوني (الصفة)</label>
                                                <input 
                                                    type="text" 
                                                    value={party.role || ''} 
                                                    onChange={(e) => handleUpdateParty('defendant', index, 'role', e.target.value)} 
                                                    placeholder="اكتب الصفة (مثال: مدعى عليه، مستأنف عليه، مميز عليه...)" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">الاسم الكامل {defendants.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('defendant', index, 'name', e.target.value)} 
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]/50 focus:ring-1 focus:ring-[#E6C673]/30 transition-all" 
                                                placeholder="أدخل الاسم الكامل" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">رقم الهاتف</label>
                                                <input 
                                                    type="text" 
                                                    value={party.phone || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'phone', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="رقم الهاتف" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">العنوان</label>
                                                <input 
                                                    type="text" 
                                                    value={party.address || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'address', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="العنوان" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Unified Toggles */}
                                        <div className="flex items-center justify-between w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-2">
                                            {/* Toggle 1: Has Lawyer */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!(party.lawyer?.name || party.lawyerName)} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!party.lawyer?.name) handleUpdateParty('defendant', index, 'lawyer.name', ' '); 
                                                        } else {
                                                            handleUpdateParty('defendant', index, 'lawyer.name', '');
                                                            handleUpdateParty('defendant', index, 'lawyer.phone', '');
                                                            handleUpdateParty('defendant', index, 'lawyer.isMyOffice', false);
                                                        }
                                                    }} 
                                                    className="form-checkbox text-indigo-500 rounded bg-slate-900 border-slate-600 focus:ring-indigo-500 w-4 h-4" 
                                                />
                                                <span className="text-sm font-bold text-slate-300">لديه وكيل (محامي)</span>
                                            </label>

                                            {/* Toggle 2: Is My Client */}
                                            {!!(party.lawyer?.name || party.lawyerName) && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={party.lawyer?.isMyOffice || false} 
                                                        onChange={(e) => handleUpdateParty('defendant', index, 'lawyer.isMyOffice', e.target.checked)} 
                                                        className="form-checkbox text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-emerald-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm font-bold text-emerald-400">هذا موكلي</span>
                                                </label>
                                            )}
                                        </div>

                                        {!!(party.lawyer?.name || party.lawyerName) && (
                                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.name || party.lawyerName || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'lawyer.name', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="اسم المحامي / الزميل" 
                                                />
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.phone || party.lawyerPhone || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'lawyer.phone', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="رقم الهاتف" 
                                                    dir="ltr" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button type="button" 
                                onClick={() => handleAddParty('defendant')}
                                className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-xs hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> إضافة طرف آخر (مدعى عليه)
                            </button>
                        </div>
                    </div>

                    {/* CRITICAL LEGAL LOGIC: Cross-Appeal Toggle - Only visible in Appeal Stage */}
                    {stageName?.includes('استئناف') && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <ArrowRightLeft size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-sm font-bold">استئناف متقابل</h4>
                                        <p className="text-white/40 text-xs">هل يوجد استئناف متقابل من الخصم؟</p>
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={() => setHasCrossAppeal(!hasCrossAppeal)}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                                        hasCrossAppeal ? 'bg-indigo-500' : 'bg-white/10'
                                    }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${
                                        hasCrossAppeal ? 'right-1' : 'left-1'
                                    }`} />
                                </button>
                            </div>
                            {hasCrossAppeal && (
                                <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="text-indigo-400">ℹ️</span>
                                    <p className="leading-relaxed">
                                        تم تفعيل خاصية الاستئناف المتقابل. سيظهر شريط خاص في واجهة القضية يوضح وجود استئناف متقابل مقدم من الخصم.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <button type="button" onClick={handleSubmit} className="w-full bg-gradient-to-r from-[#E6C673] to-[#D4AF37] text-black py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#E6C673]/20">
                        💾 حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

export const AppealRegistrationModal = ({ isOpen, onClose, onConfirm }: AppealRegistrationModalProps) => {
    const [appealMethod, setAppealMethod] = useState('');
    const [appealCaseNo, setAppealCaseNo] = useState('');
    const [appealCourt, setAppealCourt] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setAppealMethod('');
            setAppealCaseNo('');
            setAppealCourt('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!appealMethod) return;
        onConfirm({ appealMethod, appealCaseNo, appealCourt });
        onClose();
    };

    if (!isOpen) return null;

    const APPEAL_METHODS = ['استئناف', 'تمييز', 'اعتراض غيابي', 'اعتراض الغير', 'إعادة محاكمة'];

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-rose-500 to-rose-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Scale size={18}/> 
                        تسجيل طعن مقدم من الخصم
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    {/* INFO ALERT */}
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-rose-200">
                        <span className="text-rose-400 font-bold">⚠️</span>
                        <p className="leading-relaxed opacity-80">
                            سيتم نقل الدعوى تلقائياً إلى المرحلة الجديدة وسيتم فتح القفل لإضافة مواعيد المرافعة الخاصة بالطعن.
                        </p>
                    </div>

                    {/* 1. Appeal Method */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            طريق الطعن <span className="text-rose-500">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {APPEAL_METHODS.map(method => (
                                <button type="button"
                                    key={method}
                                    onClick={() => setAppealMethod(method)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                        appealMethod === method 
                                            ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20' 
                                            : 'bg-[#0F172A] text-white/60 border-white/10 hover:border-rose-500/50 hover:text-rose-400'
                                    }`}
                                >
                                    {method}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 2. Appeal Case Number */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            رقم إضبارة الطعن (إن وجد)
                        </label>
                        <input 
                            type="text" 
                            value={appealCaseNo} 
                            onChange={e => setAppealCaseNo(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500 text-right" 
                            dir="ltr"
                            placeholder="مثال: 45/س/2026"
                        />
                    </div>

                    {/* 3. Appellate Court */}
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            اسم محكمة الطعن
                        </label>
                        <input 
                            type="text" 
                            value={appealCourt} 
                            onChange={e => setAppealCourt(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-rose-500" 
                            placeholder="مثال: محكمة استئناف بغداد/الرصافة"
                        />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!appealMethod} 
                        className="w-full bg-rose-500 text-white py-3 rounded-lg font-bold text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        تسجيل الطعن ⚖️
                    </button>
                </div>
            </div>
        </div>
    );
};

export const JudicialNotificationModal = ({ isOpen, onClose, onConfirm }: JudicialNotificationModalProps) => {
    const [targetPerson, setTargetPerson] = useState('');
    const [reason, setReason] = useState('');
    const [isCompleted, setIsCompleted] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTargetPerson('');
            setReason('');
            setIsCompleted(false);
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!targetPerson || !reason) return;
        onConfirm({ targetPerson, reason, isCompleted });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <MessageCircle size={18}/> 
                        تسجيل تبليغ قضائي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            الشخص المراد تبليغه <span className="text-amber-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={targetPerson} 
                            onChange={e => setTargetPerson(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" 
                            placeholder="اسم الشخص / الجهة"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            موضوع التبليغ <span className="text-amber-500">*</span>
                        </label>
                        <input 
                            type="text" 
                            value={reason} 
                            onChange={e => setReason(e.target.value)} 
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500" 
                            placeholder="مثال: موعد مرافعة، قرار حكم..."
                        />
                    </div>

                    <div className="flex items-center gap-2 border border-white/10 p-3 rounded-lg bg-white/5 cursor-pointer" onClick={() => setIsCompleted(!isCompleted)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isCompleted ? 'bg-green-500 border-green-500' : 'border-white/30'}`}>
                            {isCompleted && <Check size={14} className="text-white" />}
                        </div>
                        <span className="text-sm text-white/80 select-none">تم التبليغ بالفعل (إضافة للسجل مباشرة)</span>
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!targetPerson || !reason} 
                        className="w-full bg-amber-500 text-white py-3 rounded-lg font-bold text-sm hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCompleted ? 'تسجيل التبليغ ✅' : 'إضافة كمهمة متابعة ⏳'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ObjectionRegistrationModal = ({ isOpen, onClose, onConfirm }: ObjectionRegistrationModalProps) => {
    const [objectionDate, setObjectionDate] = useState(getLocalTodayYmd());
    const [sessionDate, setSessionDate] = useState('');
    const [receiptNumber, setReceiptNumber] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setObjectionDate(getLocalTodayYmd());
            setSessionDate('');
            setReceiptNumber('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!objectionDate || !sessionDate) return;
        onConfirm({ objectionDate, sessionDate, receiptNumber });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Shield size={18}/> 
                        تسجيل اعتراض غيابي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <div className="bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-teal-200">
                        <span className="text-teal-400 font-bold">ℹ️</span>
                        <p className="leading-relaxed opacity-80">
                            سيتم فتح سجل جديد لمرافعة الاعتراض الغيابي وتجميد الحكم السابق لحين حسم الاعتراض.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تاريخ تقديم الاعتراض</label>
                        <input type="date" value={objectionDate} onChange={e => setObjectionDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 [color-scheme:dark]" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">موعد الجلسة الأولى <span className="text-teal-500">*</span></label>
                        <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500 [color-scheme:dark]" autoFocus />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">رقم وصل الرسوم (اختياري)</label>
                        <input type="text" value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-teal-500" placeholder="مثال: 45879" />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!objectionDate || !sessionDate} 
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-3 rounded-lg font-bold text-sm hover:from-teal-600 hover:to-emerald-700 transition-all shadow-lg shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        بدء مرافعة الاعتراض 🛡️
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ObjectionJudgmentModal = ({ isOpen, onClose, onConfirm }: ObjectionJudgmentModalProps) => {
    const [outcome, setOutcome] = useState('');
    const [details, setDetails] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setOutcome('');
            setDetails('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!outcome) return;
        onConfirm({ outcome, details });
        onClose();
    };

    if (!isOpen) return null;

    const outcomes = [
        { id: 'rejected_formally', label: 'رد الاعتراض شكلاً', desc: 'يتم تأييد الحكم الغيابي لعدم استيفاء الشروط الشكلية' },
        { id: 'petition_nullified', label: 'إبطال عريضة الاعتراض', desc: 'لترك المعترض دعواه أو عدم حضوره' },
        { id: 'upheld', label: 'قبول شكلاً وتأييد الحكم الغيابي', desc: 'الاعتراض صحيح شكلاً ولكن لا سند له قانوناً' },
        { id: 'cancelled_new_judgment', label: 'إلغاء الحكم الغيابي وإصدار حكم جديد', desc: 'قبول الاعتراض وإلغاء الحكم السابق' },
    ];

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <Gavel size={18}/> 
                        قرار الحكم في الاعتراض الغيابي
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1 text-white/80 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
                
                <div className="p-5 space-y-4">
                    <label className="block text-xs font-bold text-white/60 mb-1.5">نتيجة الاعتراض <span className="text-indigo-500">*</span></label>
                    <div className="space-y-2">
                        {outcomes.map((item) => (
                            <div 
                                key={item.id}
                                onClick={() => setOutcome(item.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${outcome === item.id ? 'bg-indigo-500/20 border-indigo-500' : 'bg-[#0F172A] border-white/10 hover:border-white/30'}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${outcome === item.id ? 'border-indigo-500' : 'border-white/40'}`}>
                                        {outcome === item.id && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                                    </div>
                                    <span className={`text-sm font-bold ${outcome === item.id ? 'text-white' : 'text-white/80'}`}>{item.label}</span>
                                </div>
                                <p className="text-[10px] text-white/40 mr-6">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">تفاصيل القرار (اختياري)</label>
                        <textarea 
                            value={details} 
                            onChange={e => setDetails(e.target.value)} 
                            rows={2}
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-indigo-500" 
                            placeholder="أي تفاصيل إضافية حول القرار..."
                        />
                    </div>

                    <button type="button" 
                        onClick={handleSubmit} 
                        disabled={!outcome} 
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-700 text-white py-3 rounded-lg font-bold text-sm hover:from-indigo-700 hover:to-purple-800 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        إصدار القرار وختم الاعتراض ⚖️
                    </button>
                </div>
            </div>
        </div>
    );
};
