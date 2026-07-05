import { useEffect, useMemo, useState } from 'react';
import { FileText, ZoomIn, Eye, Loader2, Download } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { AppDocumentPreviewOverlay } from '@/app/components/lawyer/SmartVaultModal/AppDocumentPreviewOverlay';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_PANEL } from '../forumPlumTheme';
import { downloadRepositoryFile } from '../repositoryStorageService';

export type QuestionCardAttachmentProps = {
    post: CommunityPost;
    attachmentUrl: string | null;
    attachmentLoading: boolean;
    onImageClick: (url: string) => void;
};

export function QuestionCardAttachment({
    post,
    attachmentUrl,
    attachmentLoading,
}: QuestionCardAttachmentProps) {
    if (!post.attachment) return null;
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [showImagePreview, setShowImagePreview] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [downloadingDocument, setDownloadingDocument] = useState(false);
    const attachmentName = post.attachment.name || 'Attachment';
    const attachmentMime = post.attachment.mimeType?.toLowerCase() ?? '';
    const imageContainerClassName = useMemo(
        () =>
            [
                'w-full rounded-2xl overflow-hidden border border-[#4A3D52]/50 bg-[#18121D]',
                'transition-all duration-200',
                attachmentUrl ? 'cursor-zoom-in hover:border-[#6A546F]/70' : '',
            ].join(' '),
        [attachmentUrl],
    );
    const isPdfDocument =
        post.attachment.type === 'document' &&
        (attachmentMime.includes('pdf') || /\.pdf$/i.test(attachmentName));
    const canPreviewDocument = Boolean(attachmentUrl) && isPdfDocument;

    useEffect(() => {
        setImageLoaded(false);
    }, [attachmentUrl]);

    const handleDownloadDocument = async () => {
        if (!attachmentUrl || downloadingDocument) return;
        setDownloadingDocument(true);
        try {
            await downloadRepositoryFile(attachmentUrl, attachmentName);
        } catch {
            SmartToast.error('تعذّر تحميل المستند');
        } finally {
            setDownloadingDocument(false);
        }
    };

    return (
        <div className="mb-4 mt-2">
            {post.attachment.type === 'image' ? (
                <>
                    <button
                        type="button"
                        className={imageContainerClassName}
                        onClick={() => {
                            if (attachmentUrl) setShowImagePreview(true);
                        }}
                    >
                        <div className="relative flex min-h-[320px] max-h-[70vh] w-full items-center justify-center bg-[#120D15]">
                            {attachmentLoading || !imageLoaded ? (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,rgba(18,13,21,0.78),rgba(18,13,21,0.45))]">
                                    <Loader2 size={22} className="animate-spin text-white/45" />
                                    <span className="text-[11px] font-bold text-white/45">
                                        {attachmentLoading ? 'جاري تحميل الصورة...' : 'جاري إظهار الصورة...'}
                                    </span>
                                </div>
                            ) : null}
                            {attachmentUrl ? (
                                <>
                                    <ImageWithFallback
                                        src={attachmentUrl}
                                        alt={attachmentName}
                                        className={`w-full max-h-[70vh] object-contain bg-[#120D15] transition-opacity duration-200 ${
                                            imageLoaded ? 'opacity-100' : 'opacity-0'
                                        }`}
                                        loading="eager"
                                        decoding="async"
                                        fetchPriority="high"
                                        onLoad={() => setImageLoaded(true)}
                                    />
                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/70 via-black/30 to-transparent px-4 pb-4 pt-10 text-white/85">
                                        <span className="truncate text-[11px] font-bold">{attachmentName}</span>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] font-bold">
                                            <ZoomIn size={14} />
                                            عرض كامل
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-white/40">
                                    تعذّر تحميل الصورة
                                </div>
                            )}
                        </div>
                    </button>

                    <AppDocumentPreviewOverlay
                        isOpen={showImagePreview && Boolean(attachmentUrl)}
                        onClose={() => setShowImagePreview(false)}
                        title={attachmentName}
                        fileUrl={attachmentUrl}
                        kind="image"
                        fileName={attachmentName}
                    />
                </>
            ) : null}

            {post.attachment.type === 'audio' ? (
                <div className={`w-full ${FORUM_PANEL} p-3`}>
                    <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
                    {attachmentLoading ? (
                        <div className="flex items-center gap-2 text-white/40 text-xs">
                            <Loader2 size={14} className="animate-spin" />
                            جاري تحميل المقطع...
                        </div>
                    ) : attachmentUrl ? (
                        <audio src={attachmentUrl} controls preload="metadata" className="w-full h-10" />
                    ) : (
                        <p className="text-white/40 text-xs">تعذّر تحميل المقطع الصوتي</p>
                    )}
                </div>
            ) : null}

            {post.attachment.type === 'document' ? (
                attachmentUrl ? (
                    <div className={`w-full ${FORUM_PANEL} p-3 space-y-3`}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25">
                                <FileText size={20} className="text-[#F0B896]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-white/90 text-sm font-medium truncate">{attachmentName}</p>
                                <p className="text-white/40 text-[10px]">
                                    {canPreviewDocument ? 'معاينة داخل التطبيق متاحة' : 'فتح/تحميل'}
                                </p>
                            </div>
                            {canPreviewDocument ? (
                                <button
                                    type="button"
                                    onClick={() => setShowDocumentPreview(true)}
                                    className="h-9 px-3 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors inline-flex items-center gap-2"
                                >
                                    <Eye size={15} />
                                    معاينة
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => void handleDownloadDocument()}
                                disabled={downloadingDocument}
                                className="h-9 px-3 rounded-lg border border-[#F0B896]/20 bg-[#F0B896]/10 text-[#F0B896] hover:bg-[#F0B896]/15 transition-colors inline-flex items-center gap-2"
                            >
                                {downloadingDocument ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Download size={15} />
                                )}
                                    {downloadingDocument ? 'جاري الحفظ...' : 'حفظ في الجهاز'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3`}>
                        <div className="w-10 h-10 rounded-lg bg-[#F0B896]/10 flex items-center justify-center border border-[#F0B896]/25 group-hover/doc:border-[#F0B896]/45 transition-colors">
                            <FileText size={20} className="text-[#F0B896]" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white/90 text-sm font-medium truncate">{attachmentName}</p>
                            <p className="text-white/40 text-[10px]">جاري تجهيز الملف...</p>
                        </div>
                    </div>
                )
            ) : null}

            <AppDocumentPreviewOverlay
                isOpen={showDocumentPreview && canPreviewDocument}
                onClose={() => setShowDocumentPreview(false)}
                title={attachmentName}
                fileUrl={attachmentUrl}
                kind="pdf"
                fileName={attachmentName}
                mimeType={post.attachment.mimeType ?? 'application/pdf'}
            />
        </div>
    );
}
