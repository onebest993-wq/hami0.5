import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { uuidv4 } from '@/app/services/lawyer-cloud';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

const DOCUMENT_TYPES = ['عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        type: string;
        description: string;
        file: File | null;
    }) => Promise<void>;
    onUploadSuccess?: (newDoc: RepositoryDocument) => void;
    authorName?: string;
    isSubmitting: boolean;
    editDoc?: RepositoryDocument | null;
}

export const UploadDocumentModal = ({
    isOpen,
    onClose,
    onSubmit,
    onUploadSuccess,
    authorName,
    isSubmitting,
    editDoc,
}: UploadDocumentModalProps) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<string>('عقد');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const ALLOWED_TYPES = ['.pdf', '.jpg', '.png', '.docx'] as const;
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    const validateFile = (f: File): string | null => {
        const ext = '.' + f.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_TYPES.includes(ext as typeof ALLOWED_TYPES[number])) {
            return 'نوع الملف غير مدعوم. الامتدادات المسموحة: ' + ALLOWED_TYPES.join(', ');
        }
        if (f.size > MAX_FILE_SIZE) {
            const mb = (f.size / (1024 * 1024)).toFixed(1);
            return `حجم الملف كبير جداً (${mb}MB). الحد الأقصى هو 10MB`;
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFileError(null);
        if (f) {
            const error = validateFile(f);
            if (error) {
                setFileError(error);
                SmartToast.warning(error);
                e.target.value = '';
                setFile(null);
                return;
            }
        }
        setFile(f);
    };

    useEffect(() => {
        if (isOpen) {
            if (editDoc) {
                setTitle(editDoc.title);
                setType(editDoc.type);
                setDescription(editDoc.description);
                setFile(null);
                setFileError(null);
            } else {
                setTitle('');
                setType('عقد');
                setDescription('');
                setFile(null);
                setFileError(null);
            }
        }
    }, [isOpen, editDoc]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!title.trim() || !description.trim()) {
            SmartToast.warning('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (!editDoc && !file) {
            SmartToast.warning('يرجى اختيار ملف للرفع');
            return;
        }

        if (file && !editDoc && onUploadSuccess) {
            const tempDoc: RepositoryDocument = {
                id: uuidv4(),
                title: title.trim(),
                description: description.trim(),
                type: type as RepositoryDocument['type'],
                authorId: 'pending',
                authorName: authorName || 'محامي',
                uploadDate: new Date().toISOString().split('T')[0],
                fileName: file.name,
                mimeType: file.type,
                storagePath: '',
                fileSize: file.size,
            };
            onUploadSuccess(tempDoc);
        }

        await onSubmit({ title: title.trim(), type, description: description.trim(), file });

        setTitle('');
        setType('عقد');
        setDescription('');
        setFile(null);
        setFileError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div className="w-full max-w-lg bg-[#1A1D2D] rounded-2xl border border-white/10 shadow-2xl pointer-events-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <form onSubmit={handleSubmit}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h3 className="text-white font-bold text-base">
                                {editDoc ? 'تعديل المستند' : 'رفع مستند جديد'}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">عنوان المستند</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="أدخل عنوان المستند..."
                                    className="w-full h-11 bg-[#25293C] rounded-xl px-4 text-white text-sm placeholder-white/20 border border-white/5 focus:border-[#E6C673]/30 focus:outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">نوع المستند</label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className="w-full h-11 bg-[#25293C] rounded-xl px-4 text-white text-sm border border-white/5 focus:border-[#E6C673]/30 focus:outline-none transition-colors appearance-none"
                                >
                                    {DOCUMENT_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">الوصف التفصيلي</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="أدخل وصفاً تفصيلياً للمستند..."
                                    rows={4}
                                    className="w-full bg-[#25293C] rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 border border-white/5 focus:border-[#E6C673]/30 focus:outline-none transition-colors resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">
                                    الملف (PDF, DOC, DOCX, PNG, JPG)
                                    {editDoc && <span className="text-white/30 font-normal mr-1">(اتركه فارغاً للاحتفاظ بالملف الحالي)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.png,.docx"
                                        onChange={handleFileChange}
                                        className="w-full h-11 bg-[#25293C] rounded-xl px-4 text-white/70 text-sm border border-white/5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#E6C673]/10 file:text-[#E6C673] file:text-xs file:font-bold hover:file:bg-[#E6C673]/15 transition-colors cursor-pointer"
                                    />
                                </div>
                                {fileError && (
                                    <p className="mt-1.5 text-[11px] text-red-400">{fileError}</p>
                                )}
                                {file && !fileError && (
                                    <p className="mt-1.5 text-[11px] text-white/40">{file.name} ({(file.size / (1024 * 1024)).toFixed(1)}MB)</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2.5 rounded-xl bg-[#E6C673] hover:bg-[#d4b560] disabled:bg-[#E6C673]/50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                {isSubmitting && (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                )}
                                {editDoc ? 'حفظ التعديلات' : 'نشر المستند'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};
