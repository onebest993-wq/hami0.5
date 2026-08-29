import React, { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { FORUM_PANEL } from '../forumPlumTheme';
import { isForumAddQuestionFilePickerGraceActive } from '../forumAddQuestionFilePickerGrace';
import { AddQuestionSheetOptions } from './AddQuestionSheetOptions';
import { AddQuestionSheetAttachments } from './AddQuestionSheetAttachments';
import { AddQuestionSheetFields } from './AddQuestionSheetFields';
import { ForumSheetSwipeHandle } from './ForumSheetSwipeHandle';

interface AddQuestionSheetProps {
    isOpen: boolean;
    newPostText: string;
    onNewPostTextChange: (text: string) => void;
    newTagText: string;
    onNewTagTextChange: (text: string) => void;
    newIsAnonymous: boolean;
    onNewIsAnonymousChange: (value: boolean) => void;
    newIsUrgent: boolean;
    onNewIsUrgentChange: (value: boolean) => void;
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
    onClose: () => void;
    mentionCandidates?: MentionCandidate[];
}

export const AddQuestionSheet = ({
    isOpen, newPostText, onNewPostTextChange,
    newTagText, onNewTagTextChange,
    newIsAnonymous, onNewIsAnonymousChange,
    newIsUrgent, onNewIsUrgentChange,
    newAttachment, onRemoveAttachment,
    submittingPost, isRecordingVoice, voiceRecordingSec,
    imageInputRef, docInputRef,
    onToggleVoiceRecording,
    onImageUpload, onDocUpload, onSubmit, onClose,
    mentionCandidates = [],
}: AddQuestionSheetProps) => {
    const reduceMotion = useReduceMotion();
    const { sheetStyle } = useCommunitySheetChrome(isOpen);
    const mention = useForumMentionAutocomplete(newPostText, onNewPostTextChange, mentionCandidates);
    const [exitInstant, setExitInstant] = useState(false);

    useEffect(() => {
        if (isOpen) setExitInstant(false);
    }, [isOpen]);

    const requestClose = useCallback(() => {
        if (isRecordingVoice || isForumAddQuestionFilePickerGraceActive()) return;
        flushSync(() => {
            setExitInstant(true);
            onClose();
        });
    }, [isRecordingVoice, onClose]);

    const sheetTransition =
        exitInstant || reduceMotion
            ? { duration: 0 }
            : { type: 'tween' as const, duration: 0.18, ease: [0.32, 0, 0.67, 0] as const };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={reduceMotion ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduceMotion && !exitInstant ? undefined : { opacity: 0 }}
                        transition={sheetTransition}
                        onClick={requestClose}
                        className="fixed inset-0 bg-black/70 z-[70]"
                    />
                    <motion.div
                        data-testid="forum-add-question-sheet"
                        initial={reduceMotion ? false : { y: '100%' }}
                        animate={{ y: 0 }}
                        exit={reduceMotion && !exitInstant ? undefined : { y: '100%' }}
                        transition={sheetTransition}
                        style={sheetStyle}
                        className={`fixed bottom-0 left-0 right-0 z-[70] ${FORUM_PANEL} rounded-t-[24px] p-6 border-t border-white/[0.1] pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
                    >
                        <ForumSheetSwipeHandle
                            onClose={requestClose}
                            enabled={!isRecordingVoice}
                            barClassName="h-1.5 w-12 rounded-full bg-white/20"
                        />
                        <AddQuestionSheetFields
                            mention={mention}
                            newPostText={newPostText}
                            newTagText={newTagText}
                            onNewTagTextChange={onNewTagTextChange}
                        />
                        <AddQuestionSheetOptions
                            newIsUrgent={newIsUrgent}
                            onNewIsUrgentChange={onNewIsUrgentChange}
                            newIsAnonymous={newIsAnonymous}
                            onNewIsAnonymousChange={onNewIsAnonymousChange}
                        />
                        <AddQuestionSheetAttachments
                            newAttachment={newAttachment}
                            onRemoveAttachment={onRemoveAttachment}
                            submittingPost={submittingPost}
                            isRecordingVoice={isRecordingVoice}
                            voiceRecordingSec={voiceRecordingSec}
                            imageInputRef={imageInputRef}
                            docInputRef={docInputRef}
                            onToggleVoiceRecording={onToggleVoiceRecording}
                            onImageUpload={onImageUpload}
                            onDocUpload={onDocUpload}
                            onSubmit={onSubmit}
                        />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
