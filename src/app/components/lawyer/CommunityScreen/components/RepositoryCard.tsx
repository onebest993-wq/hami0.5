import React from 'react';
import { FileText, Scale, FilePen, BookOpen, FolderOpen, Download, Loader2, Trash2, Pencil, Flag, Share2 } from 'lucide-react';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { SmartToast } from '@/app/components/ui/SmartToast';

const TYPE_ICONS: Record<string, React.ReactNode> = {
    'عقد': <FileText size={14} />,
    'قرار حكم': <Scale size={14} />,
    'عريضة': <FilePen size={14} />,
    'بحث قانوني': <BookOpen size={14} />,
    'أخرى': <FolderOpen size={14} />,
};

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
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl,
                });
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

    return (
        <div
            onClick={() => onPreview(doc)}
            className="bg-[#1A1D2D] rounded-2xl p-4 border border-white/5 hover:border-[#E6C673]/20 transition-all group cursor-pointer active:scale-[0.99]"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-[#E6C673]/10 border border-[#E6C673]/20 flex items-center justify-center text-[#E6C673]">
                        {TYPE_ICONS[doc.type] || <FolderOpen size={16} />}
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-sm leading-tight line-clamp-1">{doc.title}</h3>
                    </div>
                </div>

                <span className={`text-[10px] px-2.5 py-1 rounded-full font-medium border ${
                    doc.type === 'عقد' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                    doc.type === 'قرار حكم' ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' :
                    doc.type === 'عريضة' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
                    doc.type === 'بحث قانوني' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                    'bg-gray-500/10 border-gray-500/20 text-gray-300'
                }`}>
                    {doc.type}
                </span>
            </div>

            <p className="text-white/60 text-xs leading-relaxed mb-3 line-clamp-2">
                {doc.description}
            </p>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/40 text-[11px]">
                    <span className="flex items-center gap-1">
                        <FileText size={12} />
                        {doc.authorName}
                    </span>
                    <span>•</span>
                    <span>{doc.uploadDate}</span>
                </div>

                <div className="flex items-center gap-1">
                    {isOwner && (
                        <>
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); onDelete(doc); }}
                                disabled={deletingId === doc.id}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                    deletingId === doc.id
                                        ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                        : 'bg-red-500/5 text-red-400/60 hover:bg-red-500/15 hover:text-red-400'
                                }`}
                            >
                                {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            </button>
                            <button type="button"
                                onClick={(e) => { e.stopPropagation(); onEdit(doc); }}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:bg-white/5 hover:text-white/60 transition-all"
                            >
                                <Pencil size={14} />
                            </button>
                        </>
                    )}
                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onReport(doc); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-amber-400/60 transition-all"
                    >
                        <Flag size={14} />
                    </button>
                    <button type="button"
                        onClick={handleNativeShare}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-white/20 hover:bg-white/5 hover:text-[#E6C673]/60 transition-all"
                    >
                        <Share2 size={14} />
                    </button>
                    <button type="button"
                        onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
                        disabled={downloadingId === doc.id}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                            downloadingId === doc.id
                                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                : 'bg-[#E6C673]/10 border border-[#E6C673]/20 text-[#E6C673] hover:bg-[#E6C673]/15'
                        }`}
                    >
                        {downloadingId === doc.id ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <Download size={14} />
                        )}
                        {downloadingId === doc.id ? 'جاري التحميل...' : 'تحميل المستند'}
                    </button>
                </div>
            </div>
        </div>
    );
};
