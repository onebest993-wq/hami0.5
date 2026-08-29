import { useEffect, useState } from 'react';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { QuestionCardAttachmentImage } from './QuestionCardAttachmentImage';
import { QuestionCardAttachmentAudio } from './QuestionCardAttachmentAudio';
import { QuestionCardAttachmentDocument } from './QuestionCardAttachmentDocument';

export type QuestionCardAttachmentProps = {
    post: CommunityPost;
    attachmentUrl: string | null;
    attachmentLoading: boolean;
    onSaveToDevice?: (postId: string) => void;
    preferEagerImage?: boolean;
    onMediaReady?: () => void;
};

export function QuestionCardAttachment({
    post,
    attachmentUrl,
    attachmentLoading,
    onSaveToDevice,
    preferEagerImage = false,
    onMediaReady,
}: QuestionCardAttachmentProps) {
    const attachment = post.attachment;
    const [imageLoaded, setImageLoaded] = useState(false);

    const attachmentName = attachment?.name || 'Attachment';
    const imageAlt = attachment?.type === 'image' ? 'صورة مرفقة' : attachmentName;
    const attachmentMime = attachment?.mimeType?.toLowerCase() ?? '';
    const isPdfDocument =
        attachment?.type === 'document' &&
        (attachmentMime.includes('pdf') || /\.pdf$/i.test(attachmentName));
    const canPreviewDocument = Boolean(attachmentUrl) && isPdfDocument;

    useEffect(() => {
        setImageLoaded(false);
    }, [attachmentUrl]);

    useEffect(() => {
        if (!attachment) {
            onMediaReady?.();
            return;
        }
        if (!attachmentLoading && attachment.type !== 'image') {
            onMediaReady?.();
            return;
        }
        if (!attachmentLoading && attachment.type === 'image' && (attachmentUrl || imageLoaded)) {
            onMediaReady?.();
        }
    }, [attachment, attachmentLoading, attachmentUrl, imageLoaded, onMediaReady]);

    if (!attachment) return null;
    if (attachment.type === 'image' && attachmentLoading && !attachmentUrl) return null;

    return (
        <div className="mb-4 mt-2">
            {attachment.type === 'image' ? (
                <QuestionCardAttachmentImage
                    post={post}
                    attachmentUrl={attachmentUrl}
                    attachmentLoading={attachmentLoading}
                    onSaveToDevice={onSaveToDevice}
                    preferEagerImage={preferEagerImage}
                    imageAlt={imageAlt}
                    imageLoaded={imageLoaded}
                    onImageLoaded={() => setImageLoaded(true)}
                />
            ) : null}
            {attachment.type === 'audio' ? (
                <QuestionCardAttachmentAudio
                    attachmentUrl={attachmentUrl}
                    attachmentLoading={attachmentLoading}
                />
            ) : null}
            {attachment.type === 'document' ? (
                <QuestionCardAttachmentDocument
                    attachmentName={attachmentName}
                    attachmentUrl={attachmentUrl}
                    mimeType={attachment.mimeType}
                    canPreviewDocument={canPreviewDocument}
                />
            ) : null}
        </div>
    );
}
