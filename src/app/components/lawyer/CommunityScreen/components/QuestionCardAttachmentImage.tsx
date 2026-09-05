import { Suspense, useMemo, useState } from 'react';
import { ZoomIn } from '@/app/components/ui/icons/ZoomIn';
import { Download } from '@/app/components/ui/icons/Download';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import {
    LazyAppDocumentPreviewOverlay,
    prefetchAppDocumentPreviewOverlay,
} from '@/app/components/lawyer/SmartVaultModal/AppDocumentPreviewOverlayLazy';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

type QuestionCardAttachmentImageProps = {
    post: CommunityPost;
    attachmentUrl: string | null;
    attachmentLoading: boolean;
    onSaveToDevice?: (postId: string) => void;
    preferEagerImage?: boolean;
    imageAlt: string;
    onImageLoaded: () => void;
    imageLoaded: boolean;
};

export function QuestionCardAttachmentImage({
    post,
    attachmentUrl,
    attachmentLoading,
    onSaveToDevice,
    preferEagerImage = false,
    imageAlt,
    onImageLoaded,
    imageLoaded,
}: QuestionCardAttachmentImageProps) {
    const [showImagePreview, setShowImagePreview] = useState(false);
    const imageContainerClassName = useMemo(
        () =>
            [
                'w-full rounded-xl overflow-hidden border border-[#2A3344]/50 bg-[#161E2C]',
                'transition-all duration-200',
                attachmentUrl ? 'cursor-zoom-in hover:border-[#E6C673]/40' : '',
            ].join(' '),
        [attachmentUrl],
    );

    return (
        <>
            <div
                className={`relative ${imageContainerClassName}`}
                aria-busy={attachmentLoading || !imageLoaded || undefined}
            >
                <button
                    type="button"
                    className="block w-full text-right"
                    onPointerEnter={prefetchAppDocumentPreviewOverlay}
                    onPointerDown={prefetchAppDocumentPreviewOverlay}
                    onClick={() => {
                        if (attachmentUrl) setShowImagePreview(true);
                    }}
                    disabled={!attachmentUrl}
                >
                    <div className="relative flex min-h-[320px] max-h-[70vh] w-full items-center justify-center bg-[#120D15]">
                        {attachmentLoading || !imageLoaded ? (
                            <div
                                className="absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(18,13,21,0.78),rgba(18,13,21,0.45))]"
                                aria-hidden
                            />
                        ) : null}
                        {attachmentUrl ? (
                            <>
                                <ImageWithFallback
                                    src={attachmentUrl}
                                    alt={imageAlt}
                                    className={`w-full max-h-[70vh] object-contain bg-[#120D15] transition-opacity duration-200 ${
                                        imageLoaded ? 'opacity-100' : 'opacity-0'
                                    }`}
                                    loading={preferEagerImage ? 'eager' : 'lazy'}
                                    decoding="async"
                                    fetchPriority={preferEagerImage ? 'high' : undefined}
                                    onLoad={onImageLoaded}
                                />
                                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-center bg-gradient-to-t from-black/50 via-black/20 to-transparent px-4 pb-4 pt-10">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-[11px] font-bold text-white/85">
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
                {onSaveToDevice && attachmentUrl ? (
                    <button
                        type="button"
                        onClick={() => onSaveToDevice(post.id)}
                        className="absolute top-3 left-3 z-30 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/85 hover:text-[#E6C673] hover:border-[#E6C673]/35 transition-colors touch-manipulation"
                        title="حفظ في الجهاز"
                        aria-label="حفظ الصورة في الجهاز"
                    >
                        <Download size={18} />
                    </button>
                ) : null}
            </div>

            {showImagePreview && attachmentUrl ? (
                <Suspense fallback={null}>
                    <LazyAppDocumentPreviewOverlay
                        isOpen
                        onClose={() => setShowImagePreview(false)}
                        title="صورة مرفقة"
                        fileUrl={attachmentUrl}
                        kind="image"
                        fileName="صورة مرفقة"
                    />
                </Suspense>
            ) : null}
        </>
    );
}
