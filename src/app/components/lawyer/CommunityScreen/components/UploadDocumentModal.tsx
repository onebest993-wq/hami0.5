import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileImage, FileText, ChevronDown } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind, inferRepositoryMimeType, repositoryMediaLabel } from './repositoryMedia';
import { REPOSITORY_SUGGESTED_TAGS, formatRepositoryTag } from '../repositoryTagUtils';
import {
    type RepositoryUploadKind,
    repositoryUploadAcceptValue,
    sanitizeRepositoryUploadDescription,
    sanitizeRepositoryUploadTitle,
    validateRepositoryUploadFile,
} from '../repositoryUploadValidation';

const DOCUMENT_TYPES = ['عقد', 'قرار حكم', 'عريضة', 'بحث قانوني', 'أخرى'] as const;

interface UploadDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        title: string;
        type: string;
        description: string;
        file: File | null;
        tags: string[];
    }) => Promise<void>;
    authorName?: string;
    isSubmitting: boolean;
    editDoc?: RepositoryDocument | null;
}

export const UploadDocumentModal = ({
    isOpen,
    onClose,
    onSubmit,
    isSubmitting,
    editDoc,
}: UploadDocumentModalProps) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<string>('عقد');
    const [description, setDescription] = useState('');
    const [pickedTags, setPickedTags] = useState<string[]>([]);
    const [uploadKind, setUploadKind] = useState<RepositoryUploadKind>('document');
    const [file, setFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
    const typeMenuRef = useRef<HTMLDivElement | null>(null);

    const acceptValue = repositoryUploadAcceptValue(uploadKind);

    useEffect(() => {
        if (!file || getRepositoryMediaKind(inferRepositoryMimeType(file), file.name) !== 'image') {
            setPreviewUrl(null);
            return;
        }
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    useEffect(() => {
        if (!isOpen) return;
        if (editDoc) {
            setTitle(editDoc.title);
            setType(editDoc.type);
            setDescription(editDoc.description);
            setPickedTags(
                REPOSITORY_SUGGESTED_TAGS.filter((label) =>
                    (editDoc.tags ?? []).some((t) => formatRepositoryTag(t) === formatRepositoryTag(label)),
                ),
            );
            setUploadKind(getRepositoryMediaKind(editDoc.mimeType, editDoc.fileName) === 'image' ? 'image' : 'document');
            setFile(null);
            setFileError(null);
            setIsTypeMenuOpen(false);
            return;
        }
        setTitle('');
        setType('عقد');
        setDescription('');
        setPickedTags([]);
        setUploadKind('document');
        setFile(null);
        setFileError(null);
        setIsTypeMenuOpen(false);
    }, [isOpen, editDoc]);

    useEffect(() => {
        if (!isTypeMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!typeMenuRef.current?.contains(event.target as Node)) {
                setIsTypeMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsTypeMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isTypeMenuOpen]);

    const selectedKindLabel = useMemo(() => {
        if (!file) return null;
        return repositoryMediaLabel(getRepositoryMediaKind(inferRepositoryMimeType(file), file.name));
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null;
        setFileError(null);
        if (f) {
            const error = validateRepositoryUploadFile(f, uploadKind);
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

    const switchUploadKind = (kind: RepositoryUploadKind) => {
        setUploadKind(kind);
        setFile(null);
        setFileError(null);
    };

    const togglePickedTag = (tag: string) => {
        setPickedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
    };

    const selectedTags = useMemo(
        () => Array.from(new Set(pickedTags.map(formatRepositoryTag).filter(Boolean))),
        [pickedTags],
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const safeTitle = sanitizeRepositoryUploadTitle(title);
        const safeDescription = sanitizeRepositoryUploadDescription(description);
        if (!safeTitle || !safeDescription) {
            SmartToast.warning('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (!editDoc && !file) {
            SmartToast.warning(uploadKind === 'image' ? 'يرجى اختيار صورة' : 'يرجى اختيار ملف');
            return;
        }

        try {
            await onSubmit({
                title: safeTitle,
                type,
                description: safeDescription,
                file,
                tags: selectedTags,
            });
        } catch {
            /* parent shows toast — keep modal open */
        }
    };

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <>
            <div
                className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-lg bg-[#1A1D2D] rounded-2xl border border-white/10 shadow-2xl pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                >
                    <form onSubmit={(e) => void handleSubmit(e)}>
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                            <h3 className="text-white font-bold text-base">
                                {editDoc ? 'تعديل المستند' : 'رفع مستند جديد'}
                            </h3>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                                aria-label="إغلاق"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4 space-y-4 overflow-visible">
                            {!editDoc ? (
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => switchUploadKind('document')}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors touch-manipulation min-h-[44px] ${
                                            uploadKind === 'document'
                                                ? 'border-[#E6C673]/50 bg-[#E6C673]/10 text-[#E6C673]'
                                                : 'border-white/10 bg-[#25293C] text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <FileText size={18} />
                                        ملف (PDF / DOCX)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchUploadKind('image')}
                                        className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-bold transition-colors touch-manipulation min-h-[44px] ${
                                            uploadKind === 'image'
                                                ? 'border-sky-400/50 bg-sky-500/10 text-sky-200'
                                                : 'border-white/10 bg-[#25293C] text-white/60 hover:text-white'
                                        }`}
                                    >
                                        <FileImage size={18} />
                                        صورة (JPG / PNG)
                                    </button>
                                </div>
                            ) : null}

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

                            <div className="relative z-20" ref={typeMenuRef}>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">نوع المستند</label>
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setIsTypeMenuOpen((prev) => !prev)}
                                        className={`w-full h-11 min-h-[44px] bg-[#25293C] rounded-xl pr-4 pl-10 text-right text-white text-sm border transition-colors touch-manipulation flex items-center ${
                                            isTypeMenuOpen
                                                ? 'border-[#E6C673]/40 ring-1 ring-[#E6C673]/15'
                                                : 'border-white/5 hover:border-white/10'
                                        }`}
                                        aria-haspopup="listbox"
                                        aria-expanded={isTypeMenuOpen}
                                    >
                                        <span className="truncate">{type}</span>
                                    </button>
                                    <ChevronDown
                                        size={16}
                                        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/40 transition-transform ${
                                            isTypeMenuOpen ? 'rotate-180' : ''
                                        }`}
                                        aria-hidden
                                    />
                                    {isTypeMenuOpen ? (
                                        <div
                                            className="absolute top-[calc(100%+0.5rem)] left-0 right-0 rounded-2xl border border-white/10 bg-[#202538] shadow-2xl shadow-black/40 overflow-hidden"
                                            role="listbox"
                                            aria-label="نوع المستند"
                                        >
                                            <div className="max-h-64 overflow-y-auto py-1.5">
                                                {DOCUMENT_TYPES.map((option) => {
                                                    const active = option === type;
                                                    return (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            role="option"
                                                            aria-selected={active}
                                                            onClick={() => {
                                                                setType(option);
                                                                setIsTypeMenuOpen(false);
                                                            }}
                                                            className={`w-full px-4 py-3 text-right text-sm transition-colors ${
                                                                active
                                                                    ? 'bg-[#E6C673]/12 text-[#E6C673] font-bold'
                                                                    : 'text-white/85 hover:bg-white/5'
                                                            }`}
                                                        >
                                                            {option}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : null}
                                </div>
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
                                <label className="block text-white/70 text-xs font-bold mb-1.5">الوسوم والتصنيف</label>
                                <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto scrollbar-hide">
                                    {REPOSITORY_SUGGESTED_TAGS.map((tag) => {
                                        const active = pickedTags.includes(tag);
                                        return (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => togglePickedTag(tag)}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors touch-manipulation ${
                                                    active
                                                        ? 'bg-[#E6C673]/15 border-[#E6C673]/40 text-[#E6C673]'
                                                        : 'bg-[#25293C] border-white/10 text-white/45 hover:text-white/75'
                                                }`}
                                            >
                                                #{tag.replace(/\s+/g, '_')}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedTags.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedTags.map((tag) => (
                                            <span
                                                key={tag}
                                                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-[#E6C673]/80 border border-white/10"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div>
                                <label className="block text-white/70 text-xs font-bold mb-1.5">
                                    {uploadKind === 'image' ? 'الصورة' : 'الملف'}
                                    {editDoc ? (
                                        <span className="text-white/30 font-normal mr-1">(اتركه فارغاً للاحتفاظ بالملف الحالي)</span>
                                    ) : null}
                                </label>
                                <input
                                    key={uploadKind}
                                    type="file"
                                    accept={acceptValue}
                                    onChange={handleFileChange}
                                    className="w-full h-11 min-h-[44px] bg-[#25293C] rounded-xl px-4 text-white/70 text-sm border border-white/5 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#E6C673]/10 file:text-[#E6C673] file:text-xs file:font-bold hover:file:bg-[#E6C673]/15 transition-colors cursor-pointer touch-manipulation"
                                />
                                {fileError ? <p className="mt-1.5 text-[11px] text-red-400">{fileError}</p> : null}
                                {file && !fileError ? (
                                    <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-[#25293C] p-2.5">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                                        ) : (
                                            <div className="w-12 h-12 rounded-lg bg-[#E6C673]/10 flex items-center justify-center text-[#E6C673] shrink-0">
                                                <FileText size={20} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1 text-right">
                                            <p className="text-white text-xs font-bold truncate">{file.name}</p>
                                            <p className="text-white/40 text-[10px]">
                                                {selectedKindLabel} • {(file.size / (1024 * 1024)).toFixed(1)}MB
                                            </p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="px-5 py-2.5 min-h-[44px] rounded-xl text-sm text-white/50 hover:text-white transition-colors touch-manipulation"
                            >
                                إلغاء
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-5 py-2.5 min-h-[44px] rounded-xl bg-[#E6C673] hover:bg-[#d4b560] disabled:bg-[#E6C673]/50 disabled:cursor-not-allowed text-black text-sm font-bold transition-colors flex items-center gap-2 touch-manipulation"
                            >
                                {isSubmitting ? (
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                ) : null}
                                {editDoc ? 'حفظ التعديلات' : uploadKind === 'image' ? 'رفع الصورة' : 'رفع الملف'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>,
        document.body,
    );
};
