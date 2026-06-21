import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Square, Sparkles, Play, Trash2 } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    createArabicTranscriptSession,
    isSpeechRecognitionSupported,
} from '@/app/services/voice/speechTranscription';
import {
    MAX_VOICE_DURATION_SEC,
    MIN_VOICE_DURATION_SEC,
    formatVoiceDuration,
} from '@/app/services/voice/voiceRecordingLimits';

interface VoiceRecorderModalProps {
    onClose: () => void;
    onSaveVoice?: (payload: VoiceNoteSavePayload) => void | Promise<void>;
}

const GOLD = '#E6C673';
const PANEL =
    "w-full max-w-md rounded-[1.75rem] border border-[#E6C673]/22 bg-[#0A0F1C]/94 backdrop-blur-xl " +
    'shadow-[0_24px_64px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06),0_0_40px_rgba(230,198,115,0.06)] overflow-hidden';
const GLASS_INNER =
    'rounded-2xl border border-white/[0.07] bg-[#0c0c0e]/45 backdrop-blur-md';

export const VoiceRecorderModal = ({ onClose, onSaveVoice }: VoiceRecorderModalProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [savedToNotepad, setSavedToNotepad] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const durationRef = useRef(0);
    const transcriptRef = useRef('');
    const transcriptSessionRef = useRef<ReturnType<typeof createArabicTranscriptSession>>(null);
    const mimeTypeRef = useRef('audio/webm');

    const sttSupported = isSpeechRecognitionSupported();

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isRecording) {
            timer = setInterval(() => {
                setRecordingTime((t) => {
                    const next = t + 1;
                    durationRef.current = next;
                    if (next >= MAX_VOICE_DURATION_SEC) {
                        stopRecordingRef.current?.();
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    useEffect(() => {
        return () => {
            transcriptSessionRef.current?.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const finalizeBlob = useCallback(
        async (blob: Blob) => {
            const durationSeconds = durationRef.current;
            if (durationSeconds < MIN_VOICE_DURATION_SEC) {
                SmartToast.info('التسجيل قصير جداً — حاول مجدداً');
                resetRecording();
                return;
            }

            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            const transcript = transcriptRef.current.trim();
            if (!onSaveVoice) {
                setSavedToNotepad(false);
                setResult(
                    transcript
                        ? transcript
                        : 'تم حفظ التسجيل محلياً — أضف ملاحظة نصية في المفكرة إن لزم.',
                );
                SmartToast.success('تم حفظ التسجيل الصوتي');
                return;
            }

            setIsSaving(true);
            try {
                await onSaveVoice({ blob, durationSeconds, transcript: transcript || undefined });
                setSavedToNotepad(true);
                setResult(
                    transcript
                        ? transcript
                        : 'تم حفظ التسجيل في المفكرة — يمكنك تشغيله من المفكرة الكاملة.',
                );
            } catch {
                SmartToast.error('تعذّر حفظ التسجيل');
                setSavedToNotepad(false);
            } finally {
                setIsSaving(false);
            }
        },
        [onSaveVoice],
    );

    const stopRecordingRef = useRef<(() => void) | null>(null);

    const stopRecording = useCallback(() => {
        transcriptSessionRef.current?.stop();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    stopRecordingRef.current = stopRecording;

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];
            transcriptRef.current = '';
            setLiveTranscript('');

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            mimeTypeRef.current = mimeType;

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
                void finalizeBlob(blob);
            };

            if (sttSupported) {
                transcriptSessionRef.current?.stop();
                transcriptSessionRef.current = createArabicTranscriptSession((text) => {
                    transcriptRef.current = text;
                    setLiveTranscript(text);
                });
                transcriptSessionRef.current?.start();
            }

            recorder.start(250);
            setIsRecording(true);
            setRecordingTime(0);
            durationRef.current = 0;
            setResult(null);
            setAudioUrl(null);
            setSavedToNotepad(false);
        } catch {
            SmartToast.warning('⚠️ لم نتمكن من الوصول إلى المايكروفون. تأكد من الإذن.');
        }
    };

    const resetRecording = () => {
        transcriptSessionRef.current?.stop();
        setResult(null);
        setLiveTranscript('');
        transcriptRef.current = '';
        setAudioUrl(null);
        setRecordingTime(0);
        durationRef.current = 0;
        setSavedToNotepad(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    if (!mounted) return null;

    const primaryBtnClass = isRecording
        ? 'border border-rose-400/45 bg-rose-500/15 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.18)]'
        : result
          ? 'border border-[#34D399]/40 bg-[#34D399]/12 text-[#E8F5F0] shadow-[0_0_24px_rgba(52,211,153,0.12)]'
          : 'border border-[#E6C673]/45 bg-gradient-to-b from-[#E6C673]/20 via-[#0A0F1C]/80 to-[#05060D]/90 text-[#F5F0E6] shadow-[0_0_28px_rgba(230,198,115,0.14)]';

    return createPortal(
        <div
            className="fixed inset-0 z-[99999] flex items-end justify-center bg-[#05060D]/78 p-4 backdrop-blur-xl sm:items-center"
            dir="rtl"
        >
            <motion.div
                initial={{ y: 24, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 24, opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className={`${PANEL} font-['Tajawal','Cairo',sans-serif]`}
            >
                <div className="relative px-5 pt-5 pb-4 border-b border-[#E6C673]/12">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E6C673]/30"
                                style={{
                                    background: `color-mix(in srgb, ${GOLD} 12%, rgba(255,255,255,0.04))`,
                                    color: GOLD,
                                }}
                            >
                                <Mic size={20} strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 text-right">
                                <h3 className="text-base font-extrabold text-[#F5F0E6] tracking-tight">
                                    المسجل الذكي
                                </h3>
                                <p className="text-[11px] font-semibold text-white/40 mt-0.5">
                                    {sttSupported ? 'تسجيل + تحويل نصي (عربي)' : 'تسجيل صوتي — حتى 3 دقائق'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="إغلاق"
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55 hover:bg-white/[0.08] hover:text-white/80 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    <AnimatePresence mode="wait">
                        {!isRecording && !result && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="py-4 text-center space-y-3"
                            >
                                <p className="text-sm font-semibold text-[#C9BCA8]/75">
                                    اضغط للتسجيل — الحد الأقصى {formatVoiceDuration(MAX_VOICE_DURATION_SEC)}
                                </p>
                            </motion.div>
                        )}

                        {isRecording && (
                            <motion.div
                                key="recording"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="py-4 text-center space-y-3"
                            >
                                <p className="text-3xl font-extrabold tabular-nums tracking-widest text-[#F5F0E6]/90">
                                    {formatVoiceDuration(recordingTime)}
                                </p>
                                {liveTranscript ? (
                                    <div className={`${GLASS_INNER} p-3 text-right max-h-28 overflow-y-auto`}>
                                        <p className="text-xs text-[#E6C673]/70 mb-1">النص المباشر</p>
                                        <p className="text-sm text-[#F5F0E6]/88 leading-relaxed">{liveTranscript}</p>
                                    </div>
                                ) : sttSupported ? (
                                    <p className="text-xs text-white/35">جاري الاستماع…</p>
                                ) : null}
                            </motion.div>
                        )}

                        {result && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="space-y-3"
                            >
                                <div className={`${GLASS_INNER} p-4 text-center border-[#E6C673]/18`}>
                                    <Sparkles className="mx-auto mb-2 h-5 w-5" style={{ color: GOLD }} />
                                    <p className="text-xs font-bold text-[#E6C673]/85">
                                        {savedToNotepad ? 'تم الحفظ في المفكرة' : 'التسجيل الصوتي'}
                                    </p>
                                </div>
                                <div className={`${GLASS_INNER} p-4 max-h-36 overflow-y-auto`}>
                                    <p className="text-sm font-medium text-[#F5F0E6]/88 whitespace-pre-wrap leading-relaxed text-right">
                                        {result}
                                    </p>
                                </div>
                                {audioUrl ? (
                                    <div className={`${GLASS_INNER} flex items-center gap-3 p-3`}>
                                        <Play className="h-5 w-5 shrink-0" style={{ color: GOLD }} />
                                        <audio src={audioUrl} controls className="h-10 min-w-0 flex-1" />
                                    </div>
                                ) : null}
                                {!savedToNotepad ? (
                                    <button
                                        type="button"
                                        onClick={resetRecording}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] py-2.5 text-xs font-bold text-white/55 transition hover:bg-white/[0.04]"
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
                        onClick={() => {
                            if (isRecording) stopRecording();
                            else if (savedToNotepad) onClose();
                            else if (result) resetRecording();
                            else void startRecording();
                        }}
                        className={`flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl text-base font-extrabold transition-all active:scale-[0.985] disabled:opacity-60 ${primaryBtnClass} ${
                            isRecording ? 'animate-pulse' : ''
                        }`}
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
};
