import { useState, Suspense } from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Eye } from '@/app/components/ui/icons/Eye';
import { Download } from '@/app/components/ui/icons/Download';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    LazyAppDocumentPreviewOverlay,
    prefetchAppDocumentPreviewOverlay,
} from '@/app/components/lawyer/SmartVaultModal/AppDocumentPreviewOverlayLazy';
import { FORUM_PANEL } from '../forumPlumTheme';

type QuestionCardAttachmentDocumentProps = {
    attachmentName: string;
    attachmentUrl: string | null;
    mimeType?: string;
    canPreviewDocument: boolean;
};

export function QuestionCardAttachmentDocument({
    attachmentName,
    attachmentUrl,
    mimeType,
    canPreviewDocument,
}: QuestionCardAttachmentDocumentProps) {
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [downloadingDocument, setDownloadingDocument] = useState(false);

    const handleDownloadDocument = async () => {
        if (!attachmentUrl || downloadingDocument) return;
        setDownloadingDocument(true);
        try {
            await (
                await import('../repositoryStorageService')
            ).downloadRepositoryFile(attachmentUrl, attachmentName);
        } catch {
            SmartToast.error('تعذّر تحميل المستند');
        } finally {
            setDownloadingDocument(false);
        }
    };

    return (
        <>
            {attachmentUrl ? (
                <div className={`w-full ${FORUM_PANEL} p-3 space-y-3`}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#E6C673]/10 flex items-center justify-center border border-[#E6C673]/25">
                            <FileText size={20} className="text-[#E6C673]" />
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
                                onPointerEnter={prefetchAppDocumentPreviewOverlay}
                                onPointerDown={prefetchAppDocumentPreviewOverlay}
                                className="min-h-[44px] px-3 rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition-colors inline-flex items-center gap-2 touch-manipulation"
                            >
                                <Eye size={15} />
                                معاينة
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => void handleDownloadDocument()}
                            disabled={downloadingDocument}
                            aria-busy={downloadingDocument || undefined}
                            className="min-h-[44px] px-3 rounded-lg border border-[#E6C673]/20 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15 transition-colors inline-flex items-center gap-2 touch-manipulation disabled:opacity-60"
                        >
                            <Download size={15} />
                            حفظ في الجهاز
                        </button>
                    </div>
                </div>
            ) : (
                <div className={`w-full ${FORUM_PANEL} p-3 flex items-center gap-3`} aria-busy="true">
                    <div className="w-10 h-10 rounded-lg bg-[#E6C673]/10 flex items-center justify-center border border-[#E6C673]/25 group-hover/doc:border-[#E6C673]/45 transition-colors">
                        <FileText size={20} className="text-[#E6C673]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white/90 text-sm font-medium truncate">{attachmentName}</p>
                        <p className="min-h-[14px] rounded-sm border border-white/[0.08] bg-white/[0.035]" aria-hidden />
                    </div>
                </div>
            )}

            {showDocumentPreview && canPreviewDocument && attachmentUrl ? (
                <Suspense fallback={null}>
                    <LazyAppDocumentPreviewOverlay
                        isOpen
                        onClose={() => setShowDocumentPreview(false)}
                        title={attachmentName}
                        fileUrl={attachmentUrl}
                        kind="pdf"
                        fileName={attachmentName}
                        mimeType={mimeType ?? 'application/pdf'}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
