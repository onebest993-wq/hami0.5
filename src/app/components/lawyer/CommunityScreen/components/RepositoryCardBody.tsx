import { FileText } from '@/app/components/ui/icons/FileText';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import type { RepositoryMediaKind } from './repositoryMedia';
import { repositoryCardTypeBadgeClass } from '../repositoryCardTypeBadge';

type RepositoryCardBodyProps = {
    doc: RepositoryDocument;
    isImage: boolean;
    mediaKind: RepositoryMediaKind;
    mediaLabel: string;
    onPreview: (doc: RepositoryDocument) => void;
};

export function RepositoryCardBody({
    doc,
    isImage,
    mediaKind,
    mediaLabel,
    onPreview,
}: RepositoryCardBodyProps) {
    const typeBadgeClass = repositoryCardTypeBadgeClass(doc.type);

    return (
        <div className="px-3 pt-3 pb-2 cursor-pointer" onClick={() => onPreview(doc)}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0 flex-1">
                    {!isImage ? (
                        <div className="w-8 h-8 rounded-lg bg-[#E6C673]/10 border border-[#E6C673]/20 flex items-center justify-center text-[#E6C673] shrink-0">
                            <FileText size={14} />
                        </div>
                    ) : null}
                    <div className="min-w-0">
                        <h3 className="text-white font-bold text-sm leading-tight">{doc.title}</h3>
                        <p className="text-white/40 text-[10px] mt-0.5">
                            {doc.authorName} • {doc.uploadDate}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap justify-end gap-1 shrink-0">
                    <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${
                            mediaKind === 'pdf'
                                ? 'bg-rose-500/10 border-rose-500/25 text-rose-200'
                                : mediaKind === 'image'
                                  ? 'bg-sky-500/10 border-sky-500/25 text-sky-200'
                                  : 'bg-white/5 border-white/10 text-white/60'
                        }`}
                    >
                        {mediaLabel}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${typeBadgeClass}`}>
                        {doc.type}
                    </span>
                </div>
            </div>

            {doc.description ? (
                <p className="text-white/55 text-[11px] leading-snug mt-1.5 line-clamp-2">{doc.description}</p>
            ) : null}

            {(doc.tags?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1.5">
                    {doc.tags!.slice(0, 6).map((tag) => (
                        <span
                            key={`${doc.id}-${tag}`}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#E6C673]/75 border border-white/10"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
