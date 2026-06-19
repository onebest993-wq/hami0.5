import React, { useMemo } from 'react';
import { FileText, Paperclip, Plus } from 'lucide-react';
import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { AttachmentShieldSummary } from '@/app/components/lawyer/smart-modal/smartFile/requestTypes';
import { SmartRequestsPanel } from '@/app/components/lawyer/smart-modal/parts/SmartRequestsPanel';
import { PersonalStatusPearlSection } from '@/app/components/lawyer/personal-status/PersonalStatusPearlSection';
import { PS_BTN_PEARL } from '@/app/components/lawyer/personal-status/personalStatusPearlTheme';

type PersonalStatusWaitingSectionsProps = {
    timeline: TimelineEvent[];
    attachments: AttachmentShieldSummary[];
    onAddNote: () => void;
    onAddDocument: () => void;
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 print:hidden">
            <PersonalStatusPearlSection
                label="ملاحظات"
                variant="beige"
                className="min-h-[9rem] flex flex-col"
                bodyClassName="flex-1 min-h-0 flex flex-col gap-2"
                action={
                    <button type="button" onClick={onAddNote} className={PS_BTN_PEARL} title="ملاحظة جديدة">
                        <Plus size={11} aria-hidden />
                    </button>
                }
            >
                {notes.length === 0 ? (
                    <button
                        type="button"
                        onClick={onAddNote}
                        className="flex-1 min-h-[5.5rem] rounded-xl border border-dashed border-white/[0.14] bg-white/[0.03] flex flex-col items-center justify-center gap-1.5 text-[#9894A0] hover:border-[#F0A8B4]/28 hover:text-[#ECE8E2] transition-colors"
                    >
                        <FileText size={16} className="text-[#C9B89A]/70" aria-hidden />
                        <span className="text-[10px] font-bold">إضافة ملاحظة</span>
                    </button>
                ) : (
                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-hide">
                        {notes.map((note) => (
                            <button
                                key={note.id}
                                type="button"
                                onClick={() => onEditNote?.(note)}
                                className="w-full text-right rounded-lg border border-white/[0.10] bg-white/[0.04] px-2.5 py-2 hover:border-[#F0A8B4]/22 hover:bg-white/[0.06] transition-colors"
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
                variant="elephant"
                className="min-h-[9rem] flex flex-col"
                bodyClassName="flex-1 min-h-0 flex flex-col gap-2"
                action={
                    <button type="button" onClick={onAddDocument} className={PS_BTN_PEARL} title="مستند جديد">
                        <Plus size={11} aria-hidden />
                    </button>
                }
            >
                {attachments.length === 0 ? (
                    <button
                        type="button"
                        onClick={onAddDocument}
                        className="flex-1 min-h-[5.5rem] rounded-xl border border-dashed border-[#F0A8B4]/20 bg-[#F5C6D0]/[0.04] flex flex-col items-center justify-center gap-1.5 text-[#9894A0] hover:border-[#F0A8B4]/32 hover:text-[#ECE8E2] transition-colors"
                    >
                        <Paperclip size={16} className="text-[#F0A8B4]/70" aria-hidden />
                        <span className="text-[10px] font-bold">إرفاق مستند</span>
                    </button>
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
