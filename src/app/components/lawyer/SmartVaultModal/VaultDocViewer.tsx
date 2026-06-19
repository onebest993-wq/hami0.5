import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, ZoomIn, ExternalLink, FileText, ImageIcon } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { formatDate, formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';
import type { VaultDocViewerKind } from '@/app/services/vaultUploadService';
import { toVaultPdfViewerUrl } from '@/app/services/vaultUploadService';

interface VaultDocViewerProps {
    doc: SmartVaultDoc;
    fileUrl: string;
    kind: VaultDocViewerKind;
    onClose: () => void;
}

export const VaultDocViewer: React.FC<VaultDocViewerProps> = ({ doc, fileUrl, kind, onClose }) => {
    const isPdf = kind === 'pdf';
    const [pdfSrc, setPdfSrc] = useState<string | null>(isPdf ? null : fileUrl);
    const [pdfError, setPdfError] = useState(false);

    useEffect(() => {
        if (!isPdf) return;
        let revoked: string | null = null;
        let cancelled = false;
        setPdfError(false);
        void toVaultPdfViewerUrl(fileUrl)
            .then((blobUrl) => {
                if (cancelled) {
                    URL.revokeObjectURL(blobUrl);
                    return;
                }
                revoked = blobUrl;
                setPdfSrc(blobUrl);
            })
            .catch(() => {
                if (!cancelled) {
                    setPdfSrc(fileUrl);
                    setPdfError(true);
                }
            });
        return () => {
            cancelled = true;
            if (revoked) URL.revokeObjectURL(revoked);
        };
    }, [fileUrl, isPdf]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const openUrl = pdfSrc ?? fileUrl;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[50] flex flex-col bg-[#1a1614]/95 backdrop-blur-md"
            dir="rtl"
            onClick={onClose}
        >
            <div
                className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#C9A9A6]/12 bg-[#2E2A27] gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[#4A4440]/50 transition-colors shrink-0">
                    <X size={20} className="text-[#F7F3EB]/70" />
                </button>
                <div className="flex-1 min-w-0 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                isPdf
                                    ? 'bg-[#B8A078]/15 text-[#B8A078] border-[#B8A078]/30'
                                    : 'bg-[#C9A9A6]/15 text-[#C9A9A6] border-[#C9A9A6]/30'
                            }`}
                        >
                            {isPdf ? <FileText size={10} /> : <ImageIcon size={10} />}
                            {isPdf ? 'PDF' : 'صورة'}
                        </span>
                    </div>
                    <h3 className="text-[#F7F3EB] font-bold text-sm truncate">{doc.title}</h3>
                    <p className="text-[#C9A9A6]/50 text-[10px]">
                        {formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}
                    </p>
                </div>
                <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-[#4A4440]/50 transition-colors shrink-0"
                    title="فتح في نافذة جديدة"
                >
                    <ExternalLink size={18} className="text-[#B8A078]/70" />
                </a>
            </div>

            {doc.lawyerNote ? (
                <div className="shrink-0 px-5 py-2 border-b border-[#C9A9A6]/10 bg-[#C9A9A6]/8" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[#B8A078]/80 text-[10px] font-bold mb-0.5">الوصف</p>
                    <p className="text-[#F7F3EB]/75 text-xs leading-relaxed">{doc.lawyerNote}</p>
                </div>
            ) : null}

            <div
                className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {isPdf ? (
                    pdfSrc ? (
                        <>
                            <object
                                data={pdfSrc}
                                type="application/pdf"
                                className="flex-1 w-full min-h-0 rounded-lg border border-white/10 bg-white shadow-2xl"
                            >
                                <iframe
                                    src={pdfSrc}
                                    title={doc.title}
                                    className="w-full h-full min-h-[50vh] rounded-lg border-0"
                                />
                            </object>
                            {pdfError ? (
                                <p className="shrink-0 text-center text-amber-400/80 text-[10px] mt-2">
                                    إن لم تظهر المعاينة، استخدم زر الفتح في نافذة جديدة
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-white/40 text-sm">جاري تحميل PDF...</div>
                    )
                ) : (
                    <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar">
                        <div className="relative max-w-full max-h-full">
                            <img
                                src={fileUrl}
                                alt={doc.title}
                                className="max-w-full max-h-[calc(100dvh-200px)] object-contain rounded-lg shadow-2xl"
                                draggable={false}
                            />
                            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white/50 text-[10px]">
                                <ZoomIn size={12} />
                                معاينة داخل التطبيق
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
