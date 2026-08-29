import { FileImage } from '@/app/components/ui/icons/FileImage';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { imgFetchPriorityAttr } from '@/app/utils/imgFetchPriority';

const feedImageFrameClass =
    'w-full max-h-[280px] min-h-[120px] flex items-center justify-center bg-[#0A0F1C]';
const feedImageClass = 'max-w-full max-h-[280px] w-auto h-auto object-contain';

type RepositoryCardMediaProps = {
    doc: RepositoryDocument;
    thumbUrl: string | null;
    thumbLoading: boolean;
    priorityThumb: boolean;
    retryThumb: () => void;
    onPreview: (doc: RepositoryDocument) => void;
};

export function RepositoryCardMedia({
    doc,
    thumbUrl,
    thumbLoading,
    priorityThumb,
    retryThumb,
    onPreview,
}: RepositoryCardMediaProps) {
    return (
        <button
            type="button"
            onClick={() => onPreview(doc)}
            className="relative block w-full p-0 m-0 leading-none"
        >
            <div className={feedImageFrameClass}>
                {thumbLoading ? (
                    <Loader2 size={24} className="animate-spin text-white/20" />
                ) : thumbUrl ? (
                    <img
                        src={thumbUrl}
                        alt={doc.title}
                        className={feedImageClass}
                        loading={priorityThumb ? 'eager' : 'lazy'}
                        decoding="async"
                        {...imgFetchPriorityAttr(priorityThumb ? 'high' : 'auto')}
                        onError={retryThumb}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1 py-8 text-white/30">
                        <FileImage size={28} />
                        <span className="text-xs">المعاينة غير متاحة</span>
                    </div>
                )}
            </div>
        </button>
    );
}
