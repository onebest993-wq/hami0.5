import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ImageIcon, Paperclip, FileText, Mic, Square, Loader2, EyeOff } from 'lucide-react';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';
import type { CommunityPost } from '@/app/services/lawyer-cloud';

/** الحد الأعلى لطول المنشور — يجب أن يطابق حدّ السيرفر (10K) */
const POST_MAX_LENGTH = 10_000;
/** الحد الأعلى لطول حقل الوسوم */
const TAGS_MAX_LENGTH = 200;

const formatVoiceTime = (sec: number) =>
    `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, '0')}`;

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
    uploadingAttachment: boolean;
    isRecordingVoice: boolean;
    voiceRecordingSec: number;
    imageInputRef: React.RefObject<HTMLInputElement | null>;
    docInputRef: React.RefObject<HTMLInputElement | null>;
    onToggleVoiceRecording: () => void;
    onImageUpload: (file: File) => void;
    onDocUpload: (file: File) => void;
    onSubmit: () => void;
    onClose: () => void;
}

export const AddQuestionSheet = ({
    isOpen, newPostText, onNewPostTextChange,
    newTagText, onNewTagTextChange,
    newIsAnonymous, onNewIsAnonymousChange,
    newIsUrgent, onNewIsUrgentChange,
    newAttachment, onRemoveAttachment,
    submittingPost, uploadingAttachment, isRecordingVoice, voiceRecordingSec,
    imageInputRef, docInputRef,
    onToggleVoiceRecording,
    onImageUpload, onDocUpload, onSubmit, onClose,
}: AddQuestionSheetProps) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-[70] bg-[#25293C] rounded-t-[24px] p-6 shadow-2xl border-t border-white/10"
                    >
                        <div className="w-full flex justify-center mb-6"><div className="w-12 h-1.5 bg-white/20 rounded-full" /></div>
                        <h2 className="text-white text-lg font-bold mb-4">طرح استشارة قانونية جديدة</h2>

                        <div className="mb-4">
                            <textarea
                                value={newPostText}
                                onChange={(e) => {
                                    // قص الإدخال لمنع تجاوز حد السيرفر
                                    onNewPostTextChange(e.target.value.slice(0, POST_MAX_LENGTH));
                                }}
                                className="w-full h-32 bg-[#151822] text-white rounded-xl p-4 border border-white/5 focus:border-[#E6C673]/50 focus:outline-none resize-none placeholder-white/30 text-sm"
                                placeholder="اكتب تفاصيل استشارتك هنا بوضوح..."
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
                            <input
                                value={newTagText}
                                onChange={(e) => onNewTagTextChange(e.target.value.slice(0, TAGS_MAX_LENGTH))}
                                className="w-full h-12 bg-[#151822] text-white rounded-xl px-4 border border-white/5 focus:border-[#E6C673]/50 focus:outline-none placeholder-white/30 text-sm"
                                placeholder="وسوم اختيارية: تنفيذ، مدني، عقاري..."
                                maxLength={TAGS_MAX_LENGTH}
                            />
                        </div>

                        <div className="mb-5 space-y-3">
                            <button
                                type="button"
                                onClick={() => onNewIsAnonymousChange(!newIsAnonymous)}
                                className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between border transition-colors ${
                                    newIsAnonymous
                                        ? 'bg-[#E6C673]/10 border-[#E6C673]/30 text-white'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${newIsAnonymous ? 'bg-[#E6C673]/15 text-[#E6C673]' : 'bg-white/5 text-white/40'}`}>
                                        <EyeOff size={16} />
                                    </div>
                                    <span className="text-sm font-bold">نشر بهوية مخفية (للقضايا الحساسة)</span>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${newIsAnonymous ? 'bg-[#E6C673]/40' : 'bg-white/10'}`}>
                                    <div className={`w-5 h-5 rounded-full transition-transform ${newIsAnonymous ? 'bg-[#E6C673] translate-x-5' : 'bg-white/30 translate-x-0'}`} />
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => onNewIsUrgentChange(!newIsUrgent)}
                                className={`w-full rounded-2xl px-4 py-3 flex items-center justify-between border transition-colors ${
                                    newIsUrgent
                                        ? 'bg-red-950/30 border-red-500/30 text-white'
                                        : 'bg-white/5 border-white/10 text-white/70 hover:border-white/20'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${newIsUrgent ? 'bg-red-500/15 text-red-200' : 'bg-white/5 text-white/40'}`}>
                                        <span className="text-sm leading-none">🚨</span>
                                    </div>
                                    <span className="text-sm font-bold">طوارئ في الجلسة (أحتاج رداً فورياً)</span>
                                </div>
                                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${newIsUrgent ? 'bg-red-500/30' : 'bg-white/10'}`}>
                                    <div className={`w-5 h-5 rounded-full transition-transform ${newIsUrgent ? 'bg-red-400 translate-x-5' : 'bg-white/30 translate-x-0'}`} />
                                </div>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 mb-5">
                            <button type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${uploadingAttachment || isRecordingVoice ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#E6C673]'}`}
                                title="إرفاق صورة"
                                disabled={uploadingAttachment || isRecordingVoice}
                            >
                                <ImageIcon size={20} />
                            </button>
                            <button type="button"
                                onClick={() => docInputRef.current?.click()}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${uploadingAttachment || isRecordingVoice ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#E6C673]'}`}
                                title="إرفاق مستند"
                                disabled={uploadingAttachment || isRecordingVoice}
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    onImageUpload(file);
                                    e.target.value = '';
                                }}
                            />
                            <input
                                ref={docInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    onDocUpload(file);
                                    e.target.value = '';
                                }}
                            />
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
                                    <div className="relative w-full bg-[#151822] rounded-xl p-3 border border-white/10 pr-8">
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
                                    <div className="inline-flex items-center gap-2 bg-[#151822] px-3 py-2 rounded-lg border border-white/10 relative pr-8">
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
                                onClick={onToggleVoiceRecording}
                                disabled={uploadingAttachment}
                                className={`w-14 h-[55px] rounded-xl border flex flex-col items-center justify-center transition-colors ${
                                    isRecordingVoice
                                        ? 'bg-red-500/15 border-red-500/30 text-red-200 animate-pulse'
                                        : uploadingAttachment
                                          ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed'
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
                                onClick={() => void onSubmit()}
                                disabled={uploadingAttachment || submittingPost || isRecordingVoice}
                                className={`flex-1 h-[55px] rounded-xl flex items-center justify-center font-bold text-lg transition-transform active:scale-95 ${
                                    uploadingAttachment || submittingPost || isRecordingVoice
                                        ? 'bg-white/10 text-white/30 cursor-not-allowed'
                                        : 'bg-[#E6C673] hover:bg-[#d4b560] text-black'
                                }`}
                            >
                                {submittingPost ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={18} className="animate-spin" />
                                        جاري فحص الخصوصية...
                                    </span>
                                ) : (
                                    'نشر الاستشارة'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
