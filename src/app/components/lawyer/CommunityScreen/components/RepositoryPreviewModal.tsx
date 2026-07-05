import { useEffect } from 'react';
import { FileText, X, Download, FileImage, Eye } from 'lucide-react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind, getRepositoryMediaIconKind } from './repositoryMedia';
import {
    prefetchVaultPdfJsViewer,
    VaultPdfJsViewerLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';

export function formatRepositoryFileSize(bytes: number): string {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const idx = Math.min(i, sizes.length - 1);
    return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(1))} ${sizes[idx]}`;
}

export type RepositoryPreviewModalProps = {
    doc: RepositoryDocument;
    signedUrl: string | null;
    isLoading: boolean;
    mode: 'peek' | 'open';
    onClose: () => void;
    onDownload: (doc: RepositoryDocument) => void;
    onOpen: (doc: RepositoryDocument) => void;
};

export function RepositoryPreviewModal({
    doc,
    signedUrl,
    isLoading,
    mode,
    onClose,
    onDownload,
    onOpen,
}: RepositoryPreviewModalProps) {
    const isImage = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'image';
    const isPdf = getRepositoryMediaKind(doc.mimeType, doc.fileName) === 'pdf';
    const isOpenMode = mode === 'open';

    useEffect(() => {
        if (signedUrl && isPdf) prefetchVaultPdfJsViewer();
    }, [signedUrl, isPdf]);

    if (isImage) {
        return (
            <>
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden
                />
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                    <button
                        type="button"
                        onClick={onClose}
                        className={`absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] min-h-[44px] min-w-[44px] touch-manipulation rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors pointer-events-auto`}
                        aria-label="إغلاق"
                    >
                        <X size={22} />
                    </button>
                    {isLoading ? (
                        <svg
                            className="animate-spin h-8 w-8 text-white/30 pointer-events-auto"
                            viewBox="0 0 24 24"
                        >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                    ) : signedUrl ? (
                        <img
                            src={signedUrl}
                            alt={doc.title}
                            className={`max-w-full ${isOpenMode ? 'max-h-[92vh]' : 'max-h-[min(85vh,720px)]'} w-auto h-auto object-contain pointer-events-auto select-none`}
                            onClick={(e) => e.stopPropagation()}
                            draggable={false}
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-white/40 pointer-events-auto">
                            <FileImage size={40} />
                            <p className="text-sm">الصورة غير متاحة</p>
                        </div>
                    )}
                </div>
            </>
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className={`w-full ${isOpenMode ? 'max-w-6xl h-[92vh]' : 'max-w-lg'} bg-[#1A1D2D] rounded-2xl border border-white/10 shadow-2xl pointer-events-auto overflow-hidden flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                        <h3 className="text-white font-bold text-base">
                            {isOpenMode ? 'فتح المستند' : 'معاينة المستند'}
                        </h3>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className={`px-5 py-4 space-y-4 ${isOpenMode ? 'flex-1 overflow-hidden' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#E6C673]/10 flex items-center justify-center shrink-0 text-[#E6C673]">
                                {getRepositoryMediaIconKind(doc) === 'image' ? (
                                    <FileImage size={24} />
                                ) : (
                                    <FileText size={24} className="text-[#E6C673]" />
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-white font-bold text-sm truncate">{doc.title}</h4>
                                <p className="text-white/40 text-[11px]">{doc.type} • {doc.authorName}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-[#25293C] rounded-xl px-3 py-2.5">
                                <p className="text-white/30 text-[10px] mb-0.5">نوع الملف</p>
                                <p className="text-white text-xs font-bold truncate">{doc.mimeType || 'غير معروف'}</p>
                            </div>
                            <div className="bg-[#25293C] rounded-xl px-3 py-2.5">
                                <p className="text-white/30 text-[10px] mb-0.5">الحجم</p>
                                <p className="text-white text-xs font-bold">{formatRepositoryFileSize(doc.fileSize)}</p>
                            </div>
                        </div>

                        {doc.description ? (
                            <div className="bg-[#25293C] rounded-xl px-4 py-3">
                                <p className="text-white/30 text-[10px] mb-1">الوصف</p>
                                <p className="text-white/70 text-xs leading-relaxed">{doc.description}</p>
                            </div>
                        ) : null}

                        {isLoading ? (
                            <div className={`${isOpenMode ? 'flex-1 min-h-[320px]' : 'h-48'} bg-[#25293C] rounded-xl flex items-center justify-center`}>
                                <svg className="animate-spin h-6 w-6 text-white/20" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                        ) : signedUrl && isPdf ? (
                            <div
                                className={`${isOpenMode ? 'flex-1 min-h-[420px]' : 'h-64'} rounded-xl overflow-hidden bg-[#25293C] p-2`}
                            >
                                <VaultPdfJsViewerLazy
                                    source={signedUrl}
                                    title={doc.title}
                                    fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                                />
                            </div>
                        ) : signedUrl && isOpenMode ? (
                            <div className="flex-1 min-h-[320px] bg-[#25293C] rounded-xl flex flex-col items-center justify-center gap-3 text-center px-6">
                                <FileText size={40} className="text-white/20" />
                                <p className="text-white/70 text-sm font-bold">لا يوجد عارض داخلي كامل لهذه الصيغة</p>
                                <p className="text-white/40 text-xs">
                                    يمكنك الاطلاع على البيانات الأساسية ثم استخدام التحميل إذا كانت الصيغة غير قابلة للعرض داخل التطبيق.
                                </p>
                            </div>
                        ) : signedUrl ? (
                            <div className="h-32 bg-[#25293C] rounded-xl flex flex-col items-center justify-center gap-2">
                                <FileText size={32} className="text-white/20" />
                                <p className="text-white/40 text-xs">المعاينة غير متاحة لهذا النوع من الملفات</p>
                            </div>
                        ) : (
                            <div className="h-32 bg-[#25293C] rounded-xl flex flex-col items-center justify-center gap-2">
                                <FileText size={32} className="text-white/20" />
                                <p className="text-white/40 text-xs">الملف غير متاح حالياً</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-white/5">
                        <p className="text-white/30 text-[10px]">Uploaded: {doc.uploadDate}</p>
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => onOpen(doc)}
                                disabled={isLoading || !signedUrl || isOpenMode}
                                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                                    isLoading || !signedUrl || isOpenMode
                                        ? 'bg-white/5 text-white/25 cursor-not-allowed'
                                        : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-200'
                                }`}
                            >
                                <Eye size={16} />
                                عرض موسع
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 rounded-xl text-sm text-white/50 hover:text-white transition-colors"
                            >
                                إغلاق
                            </button>
                            <button
                                type="button"
                                onClick={() => onDownload(doc)}
                                className="px-5 py-2.5 rounded-xl bg-[#E6C673] hover:bg-[#d4b560] text-black text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <Download size={16} />
                                حفظ في الجهاز
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
