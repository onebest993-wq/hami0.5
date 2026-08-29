import React from 'react';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { ValidationBanner } from '../../components/ValidationBanner';
import { formatDateText } from '../../utils/formatters';
import type { AdminWorkspacePanelProps } from '../AdminWorkspacePanelProps';
import { URGENT_DOSSIER_BTN_GHOST } from '../urgentDossierUi';
import { AdminWorkspaceEmptyState } from './AdminWorkspaceEmptyState';

export type AdminWorkspaceAttachmentsTabProps = Pick<
    AdminWorkspacePanelProps,
    | 'isFinalized'
    | 'attachmentsError'
    | 'attachmentInputId'
    | 'addAttachmentFile'
    | 'caseAttachments'
    | 'deleteAttachment'
>;

export function AdminWorkspaceAttachmentsTab({
    isFinalized,
    attachmentsError,
    attachmentInputId,
    addAttachmentFile,
    caseAttachments,
    deleteAttachment,
}: AdminWorkspaceAttachmentsTabProps) {
    return (
        <div className="space-y-3">
            {!!attachmentsError ? <ValidationBanner text={attachmentsError} /> : null}
            <input
                id={attachmentInputId}
                type="file"
                accept="image/*,application/pdf"
                disabled={isFinalized}
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) addAttachmentFile(file);
                    e.currentTarget.value = '';
                }}
                className="hidden"
            />
            <label
                htmlFor={attachmentInputId}
                className={`${URGENT_DOSSIER_BTN_GHOST} w-full sm:w-auto ${
                    isFinalized ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }`}
            >
                <Paperclip size={16} aria-hidden />
                ارفع مستنداً
            </label>
            <div className="space-y-2 max-h-44 overflow-y-auto">
                {caseAttachments.length === 0 ? (
                    <AdminWorkspaceEmptyState text="لا توجد مرفقات" />
                ) : (
                    caseAttachments.map((a) => (
                        <div key={a.id} className="bg-black/20 border border-white/10 rounded-lg p-2.5">
                            <div className="text-white text-sm break-all">
                                {a.url ? (
                                    <a
                                        href={a.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="underline decoration-white/30 hover:decoration-white"
                                    >
                                        {a.name}
                                    </a>
                                ) : (
                                    a.name
                                )}
                            </div>
                            <div className="mt-1.5 flex items-center justify-between text-white/40 text-xs">
                                <span>{formatDateText(a.createdAt)}</span>
                                <button
                                    type="button"
                                    onClick={() => deleteAttachment(a.id)}
                                    disabled={isFinalized}
                                    className="text-red-300 hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
