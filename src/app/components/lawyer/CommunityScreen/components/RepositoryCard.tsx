import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind, repositoryMediaLabel } from './repositoryMedia';
import { useRepositoryCardThumb } from '../hooks/useRepositoryCardThumb';
import { RepositoryCardMedia } from './RepositoryCardMedia';
import { RepositoryCardBody } from './RepositoryCardBody';
import { RepositoryCardActions } from './RepositoryCardActions';

interface RepositoryCardProps {
    doc: RepositoryDocument;
    isOwner: boolean;
    downloadingId: string | null;
    deletingId: string | null;
    priorityThumb?: boolean;
    onDownload: (doc: RepositoryDocument) => void;
    onDelete: (doc: RepositoryDocument) => void;
    onEdit: (doc: RepositoryDocument) => void;
    onReport: (doc: RepositoryDocument) => void;
    onPreview: (doc: RepositoryDocument) => void;
}

export const RepositoryCard = ({
    doc,
    isOwner,
    downloadingId,
    deletingId,
    priorityThumb = false,
    onDownload,
    onDelete,
    onEdit,
    onReport,
    onPreview,
}: RepositoryCardProps) => {
    const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
    const mediaLabel = repositoryMediaLabel(mediaKind);
    const isImage = mediaKind === 'image';
    const { cardRef, thumbUrl, thumbLoading, retryThumb } = useRepositoryCardThumb(doc, isImage, priorityThumb);

    return (
        <div
            ref={cardRef}
            className="bg-[#1A1D2D] rounded-2xl border border-white/5 hover:border-[#E6C673]/20 transition-all overflow-hidden"
        >
            {isImage ? (
                <RepositoryCardMedia
                    doc={doc}
                    thumbUrl={thumbUrl}
                    thumbLoading={thumbLoading}
                    priorityThumb={priorityThumb}
                    retryThumb={retryThumb}
                    onPreview={onPreview}
                />
            ) : null}
            <RepositoryCardBody
                doc={doc}
                isImage={isImage}
                mediaKind={mediaKind}
                mediaLabel={mediaLabel}
                onPreview={onPreview}
            />
            <RepositoryCardActions
                doc={doc}
                isOwner={isOwner}
                downloadingId={downloadingId}
                deletingId={deletingId}
                onDownload={onDownload}
                onDelete={onDelete}
                onEdit={onEdit}
                onReport={onReport}
                onPreview={onPreview}
            />
        </div>
    );
};
