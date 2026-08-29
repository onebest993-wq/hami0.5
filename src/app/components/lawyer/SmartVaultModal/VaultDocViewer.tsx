import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import { ExternalLink } from '@/app/components/ui/icons/ExternalLink';
import { FileText } from '@/app/components/ui/icons/FileText';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { Music } from '@/app/components/ui/icons/Music';
import { File } from '@/app/components/ui/icons/File';
import { Download } from '@/app/components/ui/icons/Download';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { formatDate, formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';
import { downloadVaultDocToDevice, type VaultDocViewerKind } from '@/app/services/vaultUploadService';
import { vaultMediaKindLabel } from '@/app/services/vault/vaultDocUtils';
import { sanitizeVaultPreviewUrl } from '@/app/services/vault/vaultPreviewUrlSafety';
import { ZoomableContainer } from '@/app/components/shared/ZoomableContainer';
import {
    prefetchVaultPdfViewerSurface,
    VaultPdfViewerSurfaceLazy,
} from '@/app/components/lawyer/SmartVaultModal/VaultPdfViewerSurfaceLazy';
import { VAULT_SHEET_OVERLAY_VIEWPORT } from './vaultDustyRoseTheme';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface VaultDocViewerProps {
    doc: SmartVaultDoc;
    fileUrl: string;
    fileBlob?: Blob | null;
    kind: VaultDocViewerKind;
    onClose: () => void;
    overlayScope?: 'panel' | 'viewport';
}

const PANEL_OVERLAY =
    'absolute inset-0 z-[50] flex flex-col bg-[#0A0F1C] min-h-0';

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
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        setImageError(false);
    }, [fileUrl, isImage]);

    useEffect(() => {
        if (isPdf) prefetchVaultPdfViewerSurface();
    }, [isPdf]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onClose]);

    const openUrl = sanitizeVaultPreviewUrl(fileUrl) ?? '';
    const overlayClass =
        overlayScope === 'viewport'
            ? `${VAULT_SHEET_OVERLAY_VIEWPORT} flex flex-col !items-stretch !justify-stretch bg-[#0A0F1C] min-h-0`
            : PANEL_OVERLAY;

    const KindIcon = kindIcon(kind);
    const kindLabel = vaultMediaKindLabel(kind);
    const handleDownload = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        try {
            await downloadVaultDocToDevice(doc, { fileUrl: openUrl || null, fileBlob });
            SmartToast.success('تم تنزيل الملف بنجاح');
        } catch {
            SmartToast.error('تعذر تنزيل الملف');
        } finally {
            setIsDownloading(false);
        }
    };

    const viewer = (
        <div
            className={overlayClass}
            dir="rtl"
            onClick={onClose}
            data-testid="vault-doc-viewer-overlay"
        >
            <div
                className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/[0.08] bg-[#0A0F1C]/96 gap-2"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="إغلاق المعاينة"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:text-[#E6C673] hover:border-[#E6C673]/28 transition-colors"
                    >
                        <X size={20} />
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleDownload()}
                        disabled={isDownloading}
                        data-testid={`vault-doc-download-${doc.id}`}
                        aria-label={`تنزيل ${doc.title}`}
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-[#E6C673]/28 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/16 transition-colors disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>
                </div>
                <div className="flex-1 min-w-0 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                        <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                isPdf
                                    ? 'bg-[#E6C673]/12 text-[#E6C673] border-[#E6C673]/28'
                                    : isAudio
                                      ? 'bg-violet-500/12 text-violet-300 border-violet-400/28'
                                      : 'bg-sky-500/12 text-sky-300 border-sky-400/28'
                            }`}
                        >
                            <KindIcon size={10} />
                            {kindLabel}
                        </span>
                    </div>
                    <h3 className="text-[#F4F0E8] font-bold text-sm truncate">{doc.title}</h3>
                    <p className="text-white/45 text-[10px]">
                        {formatDate(doc.createdAt)} — {formatFileSize(doc.fileSize || 0)}
                    </p>
                </div>
                {openUrl ? (
                <a
                    href={openUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`فتح ${doc.title} في نافذة جديدة`}
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl border border-white/10 bg-white/[0.04] text-white/65 hover:text-[#E6C673] hover:border-[#E6C673]/28 transition-colors shrink-0"
                    title="فتح في نافذة جديدة"
                >
                    <ExternalLink size={18} />
                </a>
                ) : (
                    <span className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] shrink-0" />
                )}
            </div>

            {doc.lawyerNote ? (
                <div className="shrink-0 px-5 py-2 border-b border-white/[0.06] bg-[#E6C673]/[0.06]" onClick={(e) => e.stopPropagation()}>
                    <p className="text-[#E6C673]/80 text-[10px] font-bold mb-0.5">الوصف</p>
                    <p className="text-[#F4F0E8]/80 text-xs leading-relaxed">{doc.lawyerNote}</p>
                </div>
            ) : null}

            <div
                className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden bg-[#0A0F1C]"
                onClick={(e) => e.stopPropagation()}
            >
                {isPdf ? (
                    /* التقريب بقرصة اللمس أو Ctrl+عجلة — العجلة العادية تبقى لتمرير الصفحات */
                    <ZoomableContainer className="flex-1 min-h-0" wheelZoom="modifier" nativeVerticalScroll showControls>
                        <VaultPdfViewerSurfaceLazy
                            source={fileBlob ?? openUrl}
                            title={doc.title}
                            openUrl={openUrl}
                            fallbackClassName="flex h-full items-center justify-center text-sm text-white/45"
                        />
                    </ZoomableContainer>
                ) : isImage ? (
                    <div className="flex-1 flex items-center justify-center overflow-auto custom-scrollbar">
                        {imageError || !openUrl ? (
                            <div className="text-center text-white/55 text-sm px-4">
                                <p className="mb-2">تعذر عرض الصورة</p>
                                {openUrl ? (
                                <a
                                    href={openUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#E6C673] underline text-xs"
                                >
                                    فتح في نافذة جديدة
                                </a>
                                ) : null}
                            </div>
                        ) : (
                            <div className="relative max-w-full max-h-full">
                                <img
                                    src={openUrl}
                                    alt={doc.title}
                                    className="max-w-full max-h-[calc(100dvh-200px)] object-contain rounded-lg shadow-2xl"
                                    draggable={false}
                                    onError={() => setImageError(true)}
                                />
                                <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 text-white/60 text-[10px]">
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
                            src={openUrl || undefined}
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
                        {openUrl ? (
                        <a
                            href={openUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E6C673]/30 text-[#E6C673] text-sm font-bold hover:bg-[#E6C673]/10"
                        >
                            <ExternalLink size={16} />
                            فتح الملف
                        </a>
                        ) : null}
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
