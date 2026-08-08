import React, { useState } from 'react';
import { Eye, FileText, Pencil, Trash2, X } from '@/app/components/ui/lucideIcons';
import type { CaseAttachment } from '../types';
import { formatDateText } from '../utils/formatters';
import {
    URGENT_DOSSIER_DIALOG_OVERLAY,
    URGENT_DOSSIER_INPUT,
    URGENT_DOSSIER_BTN_GHOST,
    URGENT_DOSSIER_BTN_PRIMARY,
} from './urgentDossierUi';
import { resolveWorkspaceAttachmentKind, type WorkspaceAttachmentKind } from './workspaceAttachmentUtils';

type WorkspaceAttachmentItemProps = {
    attachment: CaseAttachment;
    disabled?: boolean;
    onDelete: () => void;
    onRename?: (name: string) => void;
};

function AttachmentPreviewOverlay({
    open,
    title,
    url,
    kind,
    onClose,
}: {
    open: boolean;
    title: string;
    url: string;
    kind: WorkspaceAttachmentKind;
    onClose: () => void;
}) {
    if (!open) return null;

    return (
        <div
            className={`${URGENT_DOSSIER_DIALOG_OVERLAY} z-[10060]`}
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label={`معاينة ${title}`}
        >
            <div
                className="w-[min(96vw,56rem)] max-h-[min(92dvh,48rem)] rounded-2xl border border-white/10 bg-[#0B1021] shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.08] shrink-0">
                    <p className="min-w-0 truncate text-sm font-extrabold text-white">{title}</p>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors touch-manipulation"
                        aria-label="إغلاق المعاينة"
                    >
                        <X size={16} aria-hidden />
                    </button>
                </div>
                <div className="flex-1 min-h-0 bg-black/30 p-3 overflow-auto">
                    {kind === 'image' ? (
                        <img
                            src={url}
                            alt={title}
                            className="mx-auto max-h-[min(80dvh,42rem)] w-full object-contain rounded-lg"
                        />
                    ) : kind === 'pdf' ? (
                        <iframe
                            src={url}
                            title={title}
                            className="w-full h-[min(78dvh,40rem)] rounded-lg border border-white/10 bg-white"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-white/50">
                            <FileText size={40} aria-hidden />
                            <p className="text-sm">لا تتوفر معاينة لهذا النوع — استخدم الاطلاع في المتصفح</p>
                            <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#E6C673] text-sm font-bold underline"
                            >
                                فتح الملف
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export function WorkspaceAttachmentItem({
    attachment,
    disabled,
    onDelete,
    onRename,
}: WorkspaceAttachmentItemProps) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editName, setEditName] = useState(attachment.name);

    const kind = resolveWorkspaceAttachmentKind(attachment.name, attachment.url);
    const canPreview = Boolean(attachment.url) && (kind === 'image' || kind === 'pdf');

    const saveRename = () => {
        const trimmed = editName.trim();
        if (!trimmed || trimmed === attachment.name) {
            setEditing(false);
            setEditName(attachment.name);
            return;
        }
        onRename?.(trimmed);
        setEditing(false);
    };

    return (
        <>
            <div className="rounded-xl border border-white/10 bg-black/25 overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <button
                    type="button"
                    disabled={!canPreview}
                    onClick={() => canPreview && setPreviewOpen(true)}
                    className={`relative block w-full h-28 bg-black/35 ${canPreview ? 'cursor-zoom-in' : 'cursor-default'}`}
                    aria-label={canPreview ? `معاينة ${attachment.name}` : attachment.name}
                >
                    {kind === 'image' && attachment.url ? (
                        <img
                            src={attachment.url}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-white/45">
                            {kind === 'pdf' ? (
                                <FileText size={32} className="text-[#E6C673]/70" aria-hidden />
                            ) : (
                                <FileText size={32} aria-hidden />
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wide">
                                {kind === 'pdf' ? 'PDF' : 'ملف'}
                            </span>
                        </div>
                    )}
                    {canPreview ? (
                        <span className="absolute bottom-2 left-2 rounded-lg border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                            معاينة
                        </span>
                    ) : null}
                </button>

                <div className="p-2.5 space-y-2">
                    {editing ? (
                        <div className="flex flex-col gap-2">
                            <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className={URGENT_DOSSIER_INPUT}
                                aria-label="اسم الملف"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={saveRename}
                                    className={`${URGENT_DOSSIER_BTN_PRIMARY} flex-1 min-h-[40px] py-2 text-xs`}
                                >
                                    حفظ الاسم
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditing(false);
                                        setEditName(attachment.name);
                                    }}
                                    className={`${URGENT_DOSSIER_BTN_GHOST} min-h-[40px] py-2 text-xs`}
                                >
                                    إلغاء
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-white truncate" title={attachment.name}>
                                    {attachment.name}
                                </p>
                                <p className="text-[11px] text-white/40 mt-0.5">
                                    {formatDateText(attachment.createdAt)}
                                </p>
                            </div>
                            {onRename && !disabled ? (
                                <button
                                    type="button"
                                    onClick={() => setEditing(true)}
                                    className="shrink-0 rounded-lg p-1.5 text-white/45 hover:text-white hover:bg-white/10 transition-colors touch-manipulation"
                                    aria-label="تسمية الملف"
                                    title="تسمية الملف"
                                >
                                    <Pencil size={14} aria-hidden />
                                </button>
                            ) : null}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {canPreview ? (
                            <button
                                type="button"
                                onClick={() => setPreviewOpen(true)}
                                className={`${URGENT_DOSSIER_BTN_GHOST} flex-1 min-h-[40px] py-2 text-xs`}
                            >
                                <Eye size={14} aria-hidden />
                                اطلاع
                            </button>
                        ) : attachment.url ? (
                            <a
                                href={attachment.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`${URGENT_DOSSIER_BTN_GHOST} flex-1 min-h-[40px] py-2 text-xs`}
                            >
                                <Eye size={14} aria-hidden />
                                فتح
                            </a>
                        ) : null}
                        <button
                            type="button"
                            onClick={onDelete}
                            disabled={disabled}
                            className="min-h-[40px] px-3 rounded-xl border border-rose-400/25 bg-rose-500/10 text-rose-200 text-xs font-bold hover:bg-rose-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                        >
                            <Trash2 size={14} className="inline me-1" aria-hidden />
                            حذف
                        </button>
                    </div>
                </div>
            </div>

            {canPreview && attachment.url ? (
                <AttachmentPreviewOverlay
                    open={previewOpen}
                    title={attachment.name}
                    url={attachment.url}
                    kind={kind}
                    onClose={() => setPreviewOpen(false)}
                />
            ) : null}
        </>
    );
}
