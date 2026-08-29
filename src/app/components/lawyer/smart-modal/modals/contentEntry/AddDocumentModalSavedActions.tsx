import React from 'react';
import { Eye } from '@/app/components/ui/icons/Eye';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { RefreshCw } from '@/app/components/ui/icons/RefreshCw';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { TimelineEvent } from '../../smartFile/modalFormTypes';

export type AddDocumentModalSavedActionsProps = {
    item: TimelineEvent;
    browseOnly: boolean;
    previewLoading: boolean;
    previewingEventId: string | null;
    isPreviewMissing: (itemId: string) => boolean;
    onPreview: (item: TimelineEvent) => void;
    onReplace?: (item: TimelineEvent) => void;
    onDelete: (item: TimelineEvent) => void;
};

export function AddDocumentModalSavedActions({
    item,
    browseOnly,
    previewLoading,
    previewingEventId,
    isPreviewMissing,
    onPreview,
    onReplace,
    onDelete,
}: AddDocumentModalSavedActionsProps) {
    const itemId = String(item.id);
    const missing = isPreviewMissing(itemId);
    const loadingThis = previewLoading && previewingEventId === itemId;

    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <button
                type="button"
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onPreview(item);
                }}
                disabled={loadingThis || missing}
                className="inline-flex items-center gap-1 rounded-xl border border-[#E6C673]/18 bg-[#E6C673]/10 px-2 py-0.5 text-[9px] font-bold text-[#E6C673] transition-colors hover:bg-[#E6C673]/18 disabled:opacity-50"
            >
                {loadingThis ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : missing ? (
                    <FileText size={12} />
                ) : (
                    <Eye size={12} />
                )}
                {missing ? 'مفقود' : 'اطلاع'}
            </button>
            {!browseOnly ? (
                <>
                    <button
                        type="button"
                        onClick={() => onReplace?.(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-white/[0.12] bg-white/[0.05] px-2 py-0.5 text-[9px] font-bold text-white/70 transition-colors hover:bg-white/[0.08]"
                    >
                        <RefreshCw size={12} />
                        استبدال
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(item)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-200 transition-colors hover:bg-rose-500/16"
                    >
                        <Trash2 size={12} />
                        حذف
                    </button>
                </>
            ) : null}
        </div>
    );
}
