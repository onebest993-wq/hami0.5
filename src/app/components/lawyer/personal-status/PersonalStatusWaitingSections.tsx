import React, { useMemo } from 'react';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import { Plus } from '@/app/components/ui/icons/Plus';
import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { AttachmentShieldSummary } from '@/app/components/lawyer/smart-modal/smartFile/requestTypes';
import { SmartRequestsPanel } from '@/app/components/lawyer/smart-modal/parts/SmartRequestsPanel';
import { PersonalStatusPearlSection } from '@/app/components/lawyer/personal-status/PersonalStatusPearlSection';
import { PS_BTN_PEARL } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';

type PersonalStatusWaitingSectionsProps = {
    timeline: TimelineEvent[];
    attachments: AttachmentShieldSummary[];
    onAddNote?: () => void;
    onAddDocument?: () => void;
    onEditNote?: (event: TimelineEvent) => void;
    onEditAttachment?: (attachment: AttachmentShieldSummary) => void;
};

export function PersonalStatusWaitingSections({
    timeline,
    attachments,
    onAddNote,
    onAddDocument,
    onEditNote,
    onEditAttachment,
}: PersonalStatusWaitingSectionsProps) {
    const notes = useMemo(
        () => timeline.filter((event) => event.type === 'note' && !(event as { deleted?: boolean }).deleted),
        [timeline],
    );

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2 print:hidden">
            <PersonalStatusPearlSection
                label="ملاحظات"
                variant="beige"
                className="min-h-0 flex flex-col"
                bodyClassName="flex-1 min-h-0 flex flex-col gap-2"
                action={
                    onAddNote ? (
                        <button type="button" onClick={onAddNote} className={PS_BTN_PEARL} title="ملاحظة جديدة">
                            <Plus size={11} aria-hidden />
                        </button>
                    ) : undefined
                }
            >
                {notes.length === 0 ? (
                    onAddNote ? (
                        <button
                            type="button"
                            onClick={onAddNote}
                            className="flex-1 min-h-[44px] rounded-md border border-dashed border-white/[0.12] bg-transparent flex items-center justify-center gap-1.5 text-white/45 hover:border-white/[0.2] hover:text-white/70 transition-colors"
                        >
                            <FileText size={14} className="text-white/40" aria-hidden />
                            <span className="text-[10px] font-bold">إضافة ملاحظة</span>
                        </button>
                    ) : null
                ) : (
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                        {notes.map((note) => (
                            <button
                                key={note.id}
                                type="button"
                                onClick={() => onEditNote?.(note)}
                                disabled={!onEditNote}
                                className="w-full text-right rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 hover:border-white/[0.14] hover:bg-white/[0.05] transition-colors disabled:pointer-events-none min-h-[44px]"
                            >
                                <span className="block text-[11px] font-bold text-[#FFFEF9] truncate">
                                    {note.title || 'ملاحظة'}
                                </span>
                                {note.details ? (
                                    <span className="block text-[9px] text-[#9894A0] truncate mt-0.5">
                                        {note.details}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </div>
                )}
            </PersonalStatusPearlSection>

            <PersonalStatusPearlSection
                label="مسندات"
                variant="glass"
                className="min-h-0 flex flex-col"
                bodyClassName="flex-1 min-h-0 flex flex-col gap-2"
                action={
                    onAddDocument ? (
                        <button type="button" onClick={onAddDocument} className={PS_BTN_PEARL} title="مستند جديد">
                            <Plus size={11} aria-hidden />
                        </button>
                    ) : undefined
                }
            >
                {attachments.length === 0 ? (
                    onAddDocument ? (
                        <button
                            type="button"
                            onClick={onAddDocument}
                            className="flex-1 min-h-[44px] rounded-md border border-dashed border-white/[0.12] bg-transparent flex items-center justify-center gap-1.5 text-white/45 hover:border-white/[0.2] hover:text-white/70 transition-colors"
                        >
                            <Paperclip size={14} className="text-white/40" aria-hidden />
                            <span className="text-[10px] font-bold">إرفاق مستند</span>
                        </button>
                    ) : null
                ) : (
                    <SmartRequestsPanel
                        petitions={[]}
                        attachments={attachments}
                        onEditAttachment={onEditAttachment}
                        visualVariant="personal"
                        embedMode="pearl-embed"
                    />
                )}
            </PersonalStatusPearlSection>
        </div>
    );
}
