import React, { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useCommunitySheetChrome } from '@/app/hooks/useCommunitySheetChrome';
import { X, ImageIcon, Paperclip, FileText, Mic, Square, Loader2, EyeOff, Zap } from 'lucide-react';
import type { MentionCandidate } from '@/app/hooks/useForumMentionAutocomplete';
import { useForumMentionAutocomplete } from '@/app/hooks/useForumMentionAutocomplete';
import { ForumMentionSuggestions } from './ForumMentionSuggestions';
import {
    URGENT_CONSULTATION_BADGE,
    URGENT_CONSULTATION_HINT,
    URGENT_CONSULTATION_LABEL,
} from '../forumUrgentConsultation';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import {
    FORUM_FIELD_LABEL,
    FORUM_ICON_BTN,
    FORUM_OPTION_ROW,
    FORUM_OPTION_ROW_ACTIVE,
    FORUM_OPTION_ROW_IDLE,
    FORUM_OPTION_ROW_URGENT_ACTIVE,
    FORUM_PANEL,
    FORUM_PUBLISH_BTN,
    FORUM_PUBLISH_BTN_DISABLED,
    FORUM_SURFACE_INPUT,
    FORUM_TEXT_MUTED,
} from '../forumPlumTheme';
import { markForumAddQuestionFilePickerOpening, isForumAddQuestionFilePickerGraceActive } from '../forumAddQuestionFilePickerGrace';

/** الحد الأعلى لطول المنشور — يجب أن يطابق حدّ السيرفر (10K) */
const POST_MAX_LENGTH = 10_000;
/** الحد الأعلى لطول حقل الوسوم */
const TAGS_MAX_LENGTH = 200;

const formatVoiceTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

function ForumToggleSwitch({ on, tone = 'gold' }: { on: boolean; tone?: 'gold' | 'amber' }) {
    const trackOn = tone === 'amber' ? 'bg-amber-400/35' : 'bg-[#C9A86C]/35';
    const knobOn = tone === 'amber' ? 'bg-amber-300' : 'bg-[#C9A86C]';
    return (
        <div
            className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 flex ${on ? trackOn : 'bg-white/10'}`}
            aria-hidden
        >
            <div
                className={`w-5 h-5 rounded-full transition-[margin,background-color] duration-200 ${
                    on ? `${knobOn} ms-auto` : 'bg-white/30'
                }`}
            />
        </div>
    );
}

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
    const { sheetStyle } = useCommunitySheetChrome();
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

    const attachmentBtnClass = (disabled: boolean) =>
        `w-10 h-10 rounded-full flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] touch-manipulation ${
            disabled
                ? 'bg-[#161E2C] text-[#9AA3B2]/30 cursor-not-allowed'
                : `${FORUM_ICON_BTN} hover:text-[#C9A86C] cursor-pointer`
        }`;

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
                        className={`fixed bottom-0 left-0 right-0 z-[70] ${FORUM_PANEL} rounded-t-[24px] p-6 shadow-2xl border-t border-white/[0.1] pb-[max(1.5rem,env(safe-area-inset-bottom))]`}
                    >
                        <div className="mb-5 flex w-full justify-center"><div className="h-1.5 w-12 rounded-full bg-white/20" /></div>

                        <div className="mb-4 relative">
                            <label htmlFor="forum-add-question-body" className={FORUM_FIELD_LABEL}>
                                مضمون النشر
                            </label>
                            {mention.showSuggestions ? (
                                <ForumMentionSuggestions
                                    suggestions={mention.suggestions}
                                    activeIndex={mention.activeIndex}
                                    onSelect={mention.insertMention}
                                    onHover={mention.setActiveIndex}
                                />
                            ) : null}
                            <textarea
                                id="forum-add-question-body"
                                ref={mention.textareaRef}
                                value={newPostText}
                                onChange={(e) => {
                                    mention.handleValueChange(
                                        e.target.value.slice(0, POST_MAX_LENGTH),
                                        e.target.selectionStart,
                                    );
                                }}
                                onKeyDown={mention.handleKeyDown}
                                onBlur={() => window.setTimeout(() => mention.closeSuggestions(), 120)}
                                className={`w-full h-32 ${FORUM_SURFACE_INPUT} rounded-xl p-4 resize-none text-sm`}
                                placeholder="اكتب سؤالك أو ملاحظتك القانونية هنا…"
                                maxLength={POST_MAX_LENGTH}
                            />
                            {newPostText.length > POST_MAX_LENGTH * 0.7 && (
                                <div
                                    className={`text-[11px] text-left mt-1 ${
                                        newPostText.length >= POST_MAX_LENGTH ? 'text-red-400' : 'text-white/40'
                                    }`}
                                >
                                    {newPostText.length.toLocaleString('ar-EG')} / {POST_MAX_LENGTH.toLocaleString('ar-EG')}
                                </div>
                            )}
                        </div>

                        <div className="mb-4">
                            <label htmlFor="forum-add-question-tags" className={FORUM_FIELD_LABEL}>
                                الوسوم <span className={`${FORUM_TEXT_MUTED} font-normal`}>(اختياري)</span>
                            </label>
                            <input
                                id="forum-add-question-tags"
                                value={newTagText}
                                onChange={(e) => onNewTagTextChange(e.target.value.slice(0, TAGS_MAX_LENGTH))}
                                className={`w-full h-12 ${FORUM_SURFACE_INPUT} rounded-xl px-4 text-sm`}
                                placeholder="مثال: جزائي، تنفيذ، أحوال شخصية"
                                maxLength={TAGS_MAX_LENGTH}
                            />
                        </div>

                        <div className="mb-5 space-y-3">
                            <button
                                type="button"
                                onClick={() => onNewIsUrgentChange(!newIsUrgent)}
                                className={`${FORUM_OPTION_ROW} justify-between ${
                                    newIsUrgent ? FORUM_OPTION_ROW_URGENT_ACTIVE : FORUM_OPTION_ROW_IDLE
                                }`}
                            >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div
                                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                            newIsUrgent
                                                ? 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/25'
                                                : 'bg-white/5 text-amber-300/70 ring-1 ring-white/10'
                                        }`}
                                    >
                                        <Zap size={16} fill={newIsUrgent ? 'currentColor' : 'none'} />
                                    </div>
                                    <div className="min-w-0 text-right">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-bold">{URGENT_CONSULTATION_LABEL}</span>
                                            <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black tracking-wide text-amber-200">
                                                {URGENT_CONSULTATION_BADGE}
                                            </span>
                                            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 text-[9px] font-bold text-white/45">
                                                24س
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-[10px] leading-relaxed text-white/45">
                                            {URGENT_CONSULTATION_HINT}
                                        </p>
                                    </div>
                                </div>
                                <ForumToggleSwitch on={newIsUrgent} tone="amber" />
                            </button>

                            <button
                                type="button"
                                onClick={() => onNewIsAnonymousChange(!newIsAnonymous)}
                                className={`${FORUM_OPTION_ROW} justify-between ${
                                    newIsAnonymous ? FORUM_OPTION_ROW_ACTIVE : FORUM_OPTION_ROW_IDLE
                                }`}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${newIsAnonymous ? 'bg-[#C9A86C]/18 text-[#C9A86C]' : 'bg-white/5 text-[#9AA3B2]'}`}>
                                        <EyeOff size={16} />
                                    </div>
                                    <span className="text-sm font-bold">نشر بهوية مخفية</span>
                                </div>
                                <ForumToggleSwitch on={newIsAnonymous} />
                            </button>
                        </div>

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

                        {newAttachment && (
                            <div className="mb-6">
                                <p className="text-white/50 text-xs mb-2">المرفقات:</p>
                                {newAttachment.type === 'image' && (
                                    <div className="relative inline-block">
                                        <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                                            <ImageWithFallback
                                                src={newAttachment.url || ''}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button type="button"
                                            onClick={onRemoveAttachment}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                {newAttachment.type === 'audio' && (
                                    <div className="relative w-full hami-forum-panel rounded-xl p-3 border border-white/10 pr-8">
                                        <p className="text-white/50 text-[10px] mb-2">مقطع صوتي</p>
                                        <audio
                                            src={newAttachment.url}
                                            controls
                                            preload="metadata"
                                            className="w-full h-10"
                                        />
                                        <button type="button"
                                            onClick={onRemoveAttachment}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                                {newAttachment.type === 'document' && (
                                    <div className="inline-flex items-center gap-2 hami-forum-panel px-3 py-2 rounded-lg border border-white/10 relative pr-8">
                                        <FileText size={16} className="text-[#E6C673]" />
                                        <span className="text-white/80 text-sm max-w-[200px] truncate">{newAttachment.name}</span>
                                        <button type="button"
                                            onClick={onRemoveAttachment}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white border border-[#25293C]"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-stretch gap-3">
                            <button
                                type="button"
                                onClick={() => void onToggleVoiceRecording()}
                                disabled={isRecordingVoice}
                                data-testid="forum-add-question-voice-btn"
                                className={`w-14 h-[55px] rounded-xl border flex flex-col items-center justify-center transition-colors ${
                                    isRecordingVoice
                                        ? 'bg-red-500/15 border-red-500/30 text-red-200 animate-pulse'
                                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                                }`}
                                title={isRecordingVoice ? 'إيقاف التسجيل' : 'نشر صوتي'}
                            >
                                {isRecordingVoice ? (
                                    <>
                                        <Square size={16} fill="currentColor" />
                                        <span className="text-[9px] mt-0.5 tabular-nums">{formatVoiceTime(voiceRecordingSec)}</span>
                                    </>
                                ) : (
                                    <Mic size={20} />
                                )}
                            </button>
                            <button type="button"
                                onClick={() => {
                                    if (submittingPost) return;
                                    void onSubmit();
                                }}
                                disabled={submittingPost || isRecordingVoice}
                                className={`flex-1 h-[55px] rounded-xl flex items-center justify-center font-bold text-lg transition-transform ${
                                    submittingPost || isRecordingVoice
                                        ? FORUM_PUBLISH_BTN_DISABLED
                                        : FORUM_PUBLISH_BTN
                                }`}
                            >
                                {submittingPost ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        جاري فحص الخصوصية...
                                    </span>
                                ) : (
                                    'نشر'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
