import React from 'react';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { Paperclip } from '@/app/components/ui/icons/Paperclip';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_ICON_BTN } from '../forumPlumTheme';
import { markForumAddQuestionFilePickerOpening } from '../forumAddQuestionFilePickerGrace';
import { AddQuestionSheetPreview } from './AddQuestionSheetPreview';
import { AddQuestionSheetPublishRow } from './AddQuestionSheetPublishRow';

type AddQuestionSheetAttachmentsProps = {
    newAttachment: CommunityPost['attachment'];
    onRemoveAttachment: () => void;
    submittingPost: boolean;
    isRecordingVoice: boolean;
    voiceRecordingSec: number;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    docInputRef: React.RefObject<HTMLInputElement | null>;
    onToggleVoiceRecording: () => void;
    onImageUpload: (file: File) => void;
    onDocUpload: (file: File) => void;
    onSubmit: () => void;
};

export function AddQuestionSheetAttachments({
    newAttachment,
    onRemoveAttachment,
    submittingPost,
    isRecordingVoice,
    voiceRecordingSec,
    imageInputRef,
    docInputRef,
    onToggleVoiceRecording,
    onImageUpload,
    onDocUpload,
    onSubmit,
}: AddQuestionSheetAttachmentsProps) {
    const attachmentBtnClass = (disabled: boolean) =>
        `w-10 h-10 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] touch-manipulation ${
            disabled
                ? 'bg-[#161E2C] text-[#9AA3B2]/30 cursor-not-allowed'
                : `${FORUM_ICON_BTN} hover:text-[#E6C673] cursor-pointer`
        }`;

    return (
        <>
            <div className="flex items-center gap-4 mb-5">
                <input
                    ref={imageInputRef}
                    id="forum-add-question-image-input"
                    data-testid="forum-add-question-image-input"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={isRecordingVoice}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void onImageUpload(file);
                        e.target.value = '';
                    }}
                />
                <input
                    ref={docInputRef}
                    id="forum-add-question-doc-input"
                    data-testid="forum-add-question-doc-input"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    disabled={isRecordingVoice}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        void onDocUpload(file);
                        e.target.value = '';
                    }}
                />
                <label
                    htmlFor="forum-add-question-image-input"
                    data-testid="forum-add-question-image-btn"
                    title="إرفاق صورة"
                    aria-label="إرفاق صورة"
                    onClick={() => markForumAddQuestionFilePickerOpening()}
                    className={attachmentBtnClass(isRecordingVoice)}
                >
                    <ImageIcon size={20} aria-hidden />
                </label>
                <label
                    htmlFor="forum-add-question-doc-input"
                    data-testid="forum-add-question-doc-btn"
                    title="إرفاق مستند"
                    aria-label="إرفاق مستند"
                    onClick={() => markForumAddQuestionFilePickerOpening()}
                    className={attachmentBtnClass(isRecordingVoice)}
                >
                    <Paperclip size={20} aria-hidden />
                </label>
            </div>

            {newAttachment ? (
                <AddQuestionSheetPreview
                    newAttachment={newAttachment}
                    onRemoveAttachment={onRemoveAttachment}
                />
            ) : null}

            <AddQuestionSheetPublishRow
                submittingPost={submittingPost}
                isRecordingVoice={isRecordingVoice}
                voiceRecordingSec={voiceRecordingSec}
                onToggleVoiceRecording={onToggleVoiceRecording}
                onSubmit={onSubmit}
            />
        </>
    );
}
