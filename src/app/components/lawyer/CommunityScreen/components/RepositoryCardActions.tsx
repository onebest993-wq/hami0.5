import React from 'react';
import { Download } from '@/app/components/ui/icons/Download';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Flag } from '@/app/components/ui/icons/Flag';
import { Share2 } from '@/app/components/ui/icons/Share2';
import { Eye } from '@/app/components/ui/icons/Eye';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { shareRepositoryDocument } from '../repositoryCardNativeShare';

export type RepositoryCardActionsProps = {
    doc: RepositoryDocument;
    isOwner: boolean;
    downloadingId: string | null;
    deletingId: string | null;
    onDownload: (doc: RepositoryDocument) => void;
    onDelete: (doc: RepositoryDocument) => void;
    onEdit: (doc: RepositoryDocument) => void;
    onReport: (doc: RepositoryDocument) => void;
    onPreview: (doc: RepositoryDocument) => void;
};

export function RepositoryCardActions({
    doc,
    isOwner,
    downloadingId,
    deletingId,
    onDownload,
    onDelete,
    onEdit,
    onReport,
    onPreview,
}: RepositoryCardActionsProps) {
    const handleNativeShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await shareRepositoryDocument(doc, window.location.origin);
    };

    return (
        <div
            className="border-t border-white/5 px-3 py-2.5 space-y-2"
            onClick={(e) => e.stopPropagation()}
            data-testid={`repository-card-actions-${doc.id}`}
        >
            <div className="grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={() => onPreview(doc)}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2 py-2 text-[11px] font-bold text-white/80 transition-all hover:bg-white/10 touch-manipulation"
                >
                    <Eye size={14} />
                    اطلاع
                </button>
                <button
                    type="button"
                    onClick={() => onDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all touch-manipulation ${
                        downloadingId === doc.id
                            ? 'border-white/10 bg-white/5 text-white/30 cursor-not-allowed'
                            : 'border-[#E6C673]/25 bg-[#E6C673]/10 text-[#E6C673] hover:bg-[#E6C673]/15'
                    }`}
                >
                    {downloadingId === doc.id ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Download size={14} />
                    )}
                    <span className="truncate">{downloadingId === doc.id ? 'جاري الحفظ...' : 'حفظ في الجهاز'}</span>
                </button>
            </div>

            <div className="flex items-center justify-end gap-0.5">
                {isOwner ? (
                    <>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit(doc);
                            }}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/35 transition-all hover:bg-white/5 hover:text-white/70 touch-manipulation"
                            title="تعديل"
                            aria-label="تعديل"
                        >
                            <Pencil size={15} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(doc);
                            }}
                            disabled={deletingId === doc.id}
                            className={`inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all touch-manipulation ${
                                deletingId === doc.id
                                    ? 'text-white/20 cursor-not-allowed'
                                    : 'text-red-400/65 hover:bg-red-500/10 hover:text-red-400'
                            }`}
                            title="حذف"
                            aria-label="حذف"
                        >
                            {deletingId === doc.id ? (
                                <Loader2 size={15} className="animate-spin" />
                            ) : (
                                <Trash2 size={15} />
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/30 transition-all hover:bg-white/5 hover:text-amber-400/70 touch-manipulation"
                    title="إبلاغ"
                    aria-label="إبلاغ"
                >
                    <Flag size={15} />
                </button>
                <button
                    type="button"
                    onClick={handleNativeShare}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white/30 transition-all hover:bg-white/5 hover:text-[#E6C673]/70 touch-manipulation"
                    title="مشاركة"
                    aria-label="مشاركة"
                >
                    <Share2 size={15} />
                </button>
            </div>
        </div>
    );
}
