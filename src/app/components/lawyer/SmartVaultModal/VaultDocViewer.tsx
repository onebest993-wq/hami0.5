import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ExternalLink, FileText, ImageIcon, Music, File } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { formatDate, formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';
import type { VaultDocViewerKind } from '@/app/services/vaultUploadService';
import { vaultMediaKindLabel } from '@/app/services/vault/vaultDocUtils';
import {
    prefetchVaultPdfJsViewer,
    VaultPdfJsViewerLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfJsViewerLazy';
import { VAULT_SHEET_OVERLAY_VIEWPORT } from './vaultDustyRoseTheme';

interface VaultDocViewerProps {
    doc: SmartVaultDoc;
    fileUrl: string;
    fileBlob?: Blob | null;
    kind: VaultDocViewerKind;
    onClose: () => void;
    overlayScope?: 'panel' | 'viewport';
}

const PANEL_OVERLAY =
    'absolute inset-0 z-[50] flex flex-col bg-[#1a1614]/95 backdrop-blur-md min-h-0';

function kindIcon(kind: VaultDocViewerKind) {
    switch (kind) {
        case 'pdf':
            return FileText;
        case 'audio':
            return Music;
        case 'file':
            return File;
        default:
            return ImageIcon;
    }
}

export const VaultDocViewer: React.FC<VaultDocViewerProps> = ({
    doc,
    fileUrl,
    fileBlob,
    kind,
    onClose,
    overlayScope = 'panel',
}) => {
    const isPdf = kind === 'pdf';
    const isImage = kind === 'image';
    const isAudio = kind === 'audio';
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [fileUrl, isImage]);

    useEffect(() => {
        if (isPdf) prefetchVaultPdfJsViewer();
    }, [isPdf]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const openUrl = fileUrl;
    const overlayClass =
        overlayScope === 'viewport'
            ? `${VAULT_SHEET_OVERLAY_VIEWPORT} flex flex-col !items-stretch !justify-stretch bg-[#1a1614]/96 min-h-0`
            : PANEL_OVERLAY;

    const KindIcon = kindIcon(kind);
    const kindLabel = vaultMediaKindLabel(kind);

    const viewer = (
        <div
            className={overlayClass}
            dir="rtl"
            onClick={onClose}
            data-testid="vault-doc-viewer-overlay"
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
                                    : isAudio
                                      ? 'bg-[#8B9DC3]/15 text-[#8B9DC3] border-[#8B9DC3]/30'
                                      : 'bg-[#C9A9A6]/15 text-[#C9A9A6] border-[#C9A9A6]/30'
                            }`}
                        >
                            <KindIcon size={10} />
                            {kindLabel}
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
                className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden bg-[#1a1614]"
                onClick={(e) => e.stopPropagation()}
            >
                {isPdf ? (
                    <VaultPdfJsViewerLazy
                        source={fileBlob ?? fileUrl}
                        title={doc.title}
                        openUrl={openUrl}
                        fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                    />
                ) : isImage ? (
                    <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar">
                        {imageError ? (
                            <div className="text-center text-white/50 text-sm px-4">
                                <p className="mb-2">تعذر عرض الصورة</p>
                                <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#E6C673] underline text-xs"
                                >
                                    فتح في نافذة جديدة
                                </a>
                            </div>
                        ) : (
                            <div className="relative max-w-full max-h-full">
                                <img
                                    src={fileUrl}
                                    alt={doc.title}
                                    className="max-w-full max-h-[calc(100dvh-200px)] object-contain rounded-lg shadow-2xl"
                                    draggable={false}
                                    onError={() => setImageError(true)}
                                />
                                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white/50 text-[10px]">
                                    <ZoomIn size={12} />
                                    معاينة داخل التطبيق
                                </div>
                            </div>
                        )}
                    </div>
                ) : isAudio ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
                        <Music size={48} className="text-[#E6C673]/60" />
                        <audio
                            controls
                            src={fileUrl}
                            className="w-full max-w-md"
                            preload="metadata"
                        >
                            متصفحك لا يدعم تشغيل الصوت
                        </audio>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
                        <File size={48} className="text-white/30" />
                        <p className="text-white/60 text-sm">{doc.fileName || doc.title}</p>
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E6C673]/30 text-[#E6C673] text-sm font-bold hover:bg-[#E6C673]/10"
                        >
                            <ExternalLink size={16} />
                            فتح الملف
                        </a>
                    </div>
                )}
            </div>
        </div>
    );

    if (overlayScope === 'viewport' && typeof document !== 'undefined') {
        return createPortal(viewer, document.body);
    }
    return viewer;
};
