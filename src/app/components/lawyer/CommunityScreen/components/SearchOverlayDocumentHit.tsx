import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { FileText } from '@/app/components/ui/icons/FileText';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { getRepositoryMediaKind } from './repositoryMedia';
import { FORUM_FEED_CARD, FORUM_TEXT_APRICOT, FORUM_TEXT_MUTED, FORUM_TEXT_PRIMARY } from '../forumPlumTheme';

export function SearchOverlayDocumentHit({
    doc,
    onOpen,
}: {
    doc: RepositoryDocument;
    onOpen?: (doc: RepositoryDocument) => void;
}) {
    const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
    return (
        <button
            type="button"
            onClick={() => onOpen?.(doc)}
            className={`w-full text-right ${FORUM_FEED_CARD} p-4`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#E2B07A]/10 flex items-center justify-center text-[#E2B07A] shrink-0">
                        <FileText size={14} />
                    </div>
                    <span className={`${FORUM_TEXT_PRIMARY} font-bold text-sm truncate`}>{doc.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/10 text-[#9AA3B2] shrink-0">
                    {doc.type}
                </span>
            </div>
            <p className={`${FORUM_TEXT_MUTED} text-xs line-clamp-2 mb-2`}>{doc.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[#9AA3B2]/70">{doc.authorName}</span>
                {mediaKind === 'pdf' ? <Paperclip size={11} className={FORUM_TEXT_APRICOT} /> : null}
                {mediaKind === 'image' ? <ImageIcon size={11} className="text-[#E2B07A]" /> : null}
                {(doc.tags ?? []).slice(0, 4).map((t) => (
                    <span key={`${doc.id}-${t}`} className="text-[10px] text-[#9AA3B2] bg-white/[0.04] px-1.5 py-0.5 rounded">
                        {t}
                    </span>
                ))}
            </div>
        </button>
    );
}
