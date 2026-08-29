import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { Mic } from '@/app/components/ui/icons/Mic';
import { Square } from '@/app/components/ui/icons/Square';
import { Sparkles } from '@/app/components/ui/icons/Sparkles';
import { Play } from '@/app/components/ui/icons/Play';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import {
    MAX_VOICE_DURATION_SEC,
    formatVoiceDuration,
} from '@/app/services/voice/voiceRecordingLimits';
import {
    VOICE_RECORDER_OVERLAY,
    VAULT_RECORDER_SHELL,
    VAULT_RECORDER_HEADER,
    VAULT_RECORDER_INNER,
} from './voiceRecorderChrome';
import type { useVoiceRecorderController } from './useVoiceRecorderController';

type VoiceRecorderModalViewProps = ReturnType<typeof useVoiceRecorderController>;

export function VoiceRecorderModalView({
    sttSupported,
    isRecording,
    isSaving,
    result,
    liveTranscript,
    recordingTime,
    audioUrl,
    savedToNotepad,
    showMicPermissionBanner,
    showMicPermissionHint,
    micReady,
    primaryBtnClass,
    requestClose,
    resetRecording,
    startRecording,
    handlePrimaryAction,
}: VoiceRecorderModalViewProps) {
    return createPortal(
        <div
            className={`${VOICE_RECORDER_OVERLAY} p-4`}
            dir="rtl"
            onClick={requestClose}
            role="presentation"
            data-testid="voice-recorder-overlay"
        >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`${VAULT_RECORDER_SHELL} font-['Tajawal','Cairo',sans-serif]`}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="المسجل الذكي"
                data-testid="voice-recorder-modal"
            >
                <div className={VAULT_RECORDER_HEADER}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#B87333]/26 bg-[#132238] text-[#C4926A]"
                            style={{
                                boxShadow: 'inset 0 1px 0 rgba(230,222,208,0.05)',
                            }}
                        >
                            <Mic size={20} strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0 text-right">
                            <h3 className="text-base font-bold tracking-tight text-[#F4F0E8]">المسجل الذكي</h3>
                            <p className="mt-0.5 text-[11px] font-medium text-[#C9BCA8]/55">
                                {sttSupported ? 'تسجيل + تحويل نصي (عربي)' : 'تسجيل صوتي — حتى 3 دقائق'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={requestClose}
                        data-testid="voice-recorder-close"
                        aria-label="إغلاق"
                        className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border border-[#D9CFC0]/12 bg-[#132238]/85 text-[#C9BCA8]/70 hover:border-[#B87333]/24 hover:bg-[#132238] hover:text-[#F4F0E8] transition-colors touch-manipulation"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 bg-[#0E1B2E] p-5">
                    {showMicPermissionBanner ? (
                        <div
                            className="rounded-2xl border border-amber-400/28 bg-amber-500/10 px-4 py-3 text-center text-xs font-medium leading-relaxed text-amber-100/90 space-y-2"
                            data-testid="voice-recorder-permission-banner"
                            role="status"
                        >
                            <p>
                                تم رفض إذن المايكروفون — فعّله من إعدادات التطبيق أو المتصفح ثم أعد المحاولة.
                            </p>
                            <button
                                type="button"
                                onClick={() => void startRecording()}
                                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-300/35 bg-amber-500/15 px-4 text-xs font-bold text-amber-50 hover:bg-amber-500/22 touch-manipulation"
                                data-testid="voice-recorder-permission-retry"
                            >
                                إعادة المحاولة
                            </button>
                        </div>
                    ) : null}

                    {micReady && !showMicPermissionBanner && !isRecording && !result ? (
                        <p
                            className="rounded-2xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-2.5 text-center text-[11px] font-medium text-emerald-100/85"
                            data-testid="voice-recorder-mic-ready"
                            role="status"
                        >
                            المايكروفون جاهز — اضغط «ابدأ التسجيل»
                        </p>
                    ) : null}

                    {showMicPermissionHint ? (
                        <p
                            className="rounded-2xl border border-[#D9CFC0]/12 bg-[#132238]/72 px-4 py-3 text-center text-xs font-medium text-[#C9BCA8]/60"
                            data-testid="voice-recorder-permission-hint"
                            role="status"
                        >
                            عند الضغط على «ابدأ التسجيل» سيُطلب إذن المايكروفون.
                        </p>
                    ) : null}

                    <AnimatePresence mode="wait">
                        {!isRecording && !result && (
                            <motion.p
                                key="idle"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="rounded-2xl border border-[#D9CFC0]/12 bg-[#132238]/72 px-4 py-3 text-center text-sm font-medium text-[#C9BCA8]/70"
                                data-testid="voice-recorder-idle-hint"
                            >
                                اضغط للتسجيل — الحد الأقصى {formatVoiceDuration(MAX_VOICE_DURATION_SEC)}
                            </motion.p>
                        )}

                        {isRecording && (
                            <motion.div
                                key="recording"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="py-2 text-center space-y-3"
                            >
                                <p
                                    className="text-3xl font-bold tabular-nums tracking-widest text-[#F4F0E8]"
                                    data-testid="voice-recorder-timer"
                                >
                                    {formatVoiceDuration(recordingTime)}
                                </p>
                                {liveTranscript ? (
                                    <div className={`${VAULT_RECORDER_INNER} max-h-28 overflow-y-auto p-3 text-right`}>
                                        <p className="mb-1 text-xs text-[#C4926A]">النص المباشر</p>
                                        <p className="text-sm leading-relaxed text-[#E8E4DC]">{liveTranscript}</p>
                                    </div>
                                ) : sttSupported ? (
                                    <p className="text-xs text-[#C9BCA8]/46">جاري الاستماع…</p>
                                ) : null}
                            </motion.div>
                        )}

                        {result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-3"
                                data-testid="voice-recorder-result"
                            >
                                <div className={`${VAULT_RECORDER_INNER} border-[#B87333]/18 p-4 text-center`}>
                                    <Sparkles className="mx-auto mb-2 h-5 w-5 text-[#C4926A]" />
                                    <p className="text-xs font-bold text-[#C4926A]">
                                        {savedToNotepad ? 'تم الحفظ في المفكرة' : 'التسجيل الصوتي'}
                                    </p>
                                </div>
                                <div className={`${VAULT_RECORDER_INNER} max-h-36 overflow-y-auto p-4`}>
                                    <p className="whitespace-pre-wrap text-right text-sm font-medium leading-relaxed text-[#E8E4DC]">
                                        {result}
                                    </p>
                                </div>
                                {audioUrl ? (
                                    <div className={`${VAULT_RECORDER_INNER} flex items-center gap-3 p-3`}>
                                        <Play className="h-5 w-5 shrink-0 text-[#C4926A]" />
                                        <audio src={audioUrl} controls className="h-10 min-w-0 flex-1" />
                                    </div>
                                ) : null}
                                {!savedToNotepad ? (
                                    <button
                                        type="button"
                                        onClick={resetRecording}
                                        data-testid="voice-recorder-reset"
                                        className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-[#D9CFC0]/12 bg-[#132238]/55 py-2.5 text-xs font-bold text-[#C9BCA8] transition hover:border-[#B87333]/20 hover:bg-[#132238]/85 touch-manipulation"
                                    >
                                        <Trash2 size={15} />
                                        تسجيل جديد
                                    </button>
                                ) : null}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={handlePrimaryAction}
                        data-testid={
                            isRecording
                                ? 'voice-recorder-stop'
                                : savedToNotepad
                                  ? 'voice-recorder-done'
                                  : result
                                    ? 'voice-recorder-new'
                                    : 'voice-recorder-start'
                        }
                        className={primaryBtnClass}
                    >
                        {isSaving ? (
                            'جاري الحفظ…'
                        ) : isRecording ? (
                            <>
                                <Square size={18} />
                                إيقاف التسجيل
                            </>
                        ) : savedToNotepad ? (
                            <>
                                <Sparkles size={18} />
                                تم — إغلاق
                            </>
                        ) : result ? (
                            <>
                                <Mic size={18} />
                                تسجيل جديد
                            </>
                        ) : (
                            <>
                                <Mic size={18} />
                                ابدأ التسجيل
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body,
    );
}
