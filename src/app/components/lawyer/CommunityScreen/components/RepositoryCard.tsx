import React, { useEffect, useState } from 'react';
import { FileText, Download, Loader2, Trash2, Pencil, Flag, Share2, FileImage } from 'lucide-react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getRepositoryMediaKind, repositoryMediaLabel } from './repositoryMedia';
import { resolveRepositoryStorageUrl } from '../repositoryStorageService';

interface RepositoryCardProps {
    doc: RepositoryDocument;
    isOwner: boolean;
    downloadingId: string | null;
    deletingId: string | null;
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
    onDownload,
    onDelete,
    onEdit,
    onReport,
    onPreview,
}: RepositoryCardProps) => {
    const mediaKind = getRepositoryMediaKind(doc.mimeType, doc.fileName);
    const mediaLabel = repositoryMediaLabel(mediaKind);
    const isImage = mediaKind === 'image';
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);
    const [thumbLoading, setThumbLoading] = useState(isImage && Boolean(doc.storagePath));

    useEffect(() => {
        if (!isImage || !doc.storagePath) {
            setThumbUrl(null);
            setThumbLoading(false);
            return;
        }
        let cancelled = false;
        setThumbLoading(true);
        void resolveRepositoryStorageUrl(doc.storagePath)
            .then((url) => {
                if (!cancelled) setThumbUrl(url);
            })
            .finally(() => {
                if (!cancelled) setThumbLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [doc.id, doc.storagePath, isImage]);

    const handleNativeShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!doc.storagePath) {
            SmartToast.error('رابط الملف غير متاح للمشاركة');
            return;
        }
        const shareUrl = `${window.location.origin}/api/file/${doc.storagePath}`;
        const shareTitle = doc.title || 'مستند قانوني';
        const shareText = doc.description
            ? `مستند: ${doc.title} — ${doc.description}`
            : `مستند: ${doc.title}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    SmartToast.error('فشلت عملية المشاركة');
                }
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                SmartToast.success('تم نسخ رابط الملف');
            } catch {
                SmartToast.error('تعذر نسخ الرابط');
            }
        }
    };

    const typeBadgeClass =
        doc.type === 'عقد'
            ? 'bg-blue-500/10 border-blue-500/20 text-blue-300'
            : doc.type === 'قرار حكم'
              ? 'bg-purple-500/10 border-purple-500/20 text-purple-300'
              : doc.type === 'عريضة'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : doc.type === 'بحث قانوني'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-gray-500/10 border-gray-500/20 text-gray-300';

    /** معاينة بطاقة — صورة كاملة بحجم معقول (بدون قص) */
    const feedImageFrameClass =
        'w-full max-h-[280px] min-h-[120px] flex items-center justify-center bg-[#0A0F1C]';
    const feedImageClass = 'max-w-full max-h-[280px] w-auto h-auto object-contain';

    return (
        <div className="bg-[#1A1D2D] rounded-2xl border border-white/5 hover:border-[#E6C673]/20 transition-all overflow-hidden">
            {isImage ? (
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
                                loading="lazy"
                            />
                        ) : (
                            <div className="flex flex-col items-center gap-1 py-8 text-white/30">
                                <FileImage size={28} />
                                <span className="text-xs">المعاينة غير متاحة</span>
                            </div>
                        )}
                    </div>
                </button>
            ) : null}

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

            <div
                className="flex items-center justify-between gap-2 px-3 py-2 border-t border-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={() => onDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        downloadingId === doc.id
                            ? 'bg-white/10 text-white/30 cursor-not-allowed'
                            : 'bg-[#E6C673]/10 border border-[#E6C673]/20 text-[#E6C673] hover:bg-[#E6C673]/15'
                    }`}
                >
                    {downloadingId === doc.id ? (
                        <Loader2 size={13} className="animate-spin" />
                    ) : (
                        <Download size={13} />
                    )}
                    {downloadingId === doc.id ? 'جاري التحميل...' : 'تحميل'}
                </button>

                <div className="flex items-center gap-0.5">
                    {isOwner ? (
                        <>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(doc);
                                }}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white/60 transition-all"
                                title="تعديل"
                            >
                                <Pencil size={13} />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(doc);
                                }}
                                disabled={deletingId === doc.id}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                    deletingId === doc.id
                                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                        : 'bg-red-500/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400'
                                }`}
                                title="حذف"
                            >
                                {deletingId === doc.id ? (
                                    <Loader2 size={13} className="animate-spin" />
                                ) : (
                                    <Trash2 size={13} />
                                )}
                            </button>
                        </>
                    ) : null}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onReport(doc);
                        }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-amber-400/60 transition-all"
                        title="إبلاغ"
                    >
                        <Flag size={13} />
                    </button>
                    <button
                        type="button"
                        onClick={handleNativeShare}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-[#E6C673]/60 transition-all"
                        title="مشاركة"
                    >
                        <Share2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
};
