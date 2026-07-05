import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, Square, Sparkles, Play, Trash2 } from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    VAULT_INPUT,
    VAULT_SHEET,
    VAULT_SHEET_OVERLAY_VIEWPORT,
} from '@/app/components/lawyer/SmartVaultModal/vaultDustyRoseTheme';
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
const VAULT_RECORDER_SHELL =
    `${VAULT_SHEET} relative w-full max-w-md overflow-hidden rounded-[22px] sm:rounded-[22px] ` +
    'border-[#B87333]/18 shadow-[0_24px_80px_rgba(0,0,0,0.52)]';
const VAULT_RECORDER_HEADER =
    'relative flex items-center justify-between border-b border-[#B87333]/14 px-5 py-4 ' +
    'bg-gradient-to-l from-[#132238] via-[#0E1B2E] to-[#0a1524]';
const VAULT_RECORDER_INNER =
    'rounded-2xl border border-[#D9CFC0]/16 bg-gradient-to-br from-[#15253a] via-[#132238] to-[#0E1B2E] ' +
    'shadow-[inset_0_1px_0_rgba(230,222,208,0.06)]';
const PEARL_BTN_GOLD =
    'flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-sm transition-all ' +
    'bg-[#B87333]/18 border border-[#B87333]/35 text-[#E8E4DC] hover:bg-[#B87333]/26 active:scale-[0.985] disabled:opacity-60';
const PEARL_BTN_STOP =
    'flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl font-bold text-sm transition-all ' +
    'border border-rose-400/38 bg-rose-500/12 text-rose-100 active:scale-[0.985] disabled:opacity-60 animate-pulse';

function pickRecorderMimeType(): string | undefined {
    if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
        return undefined;
    }
    const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const candidate of candidates) {
        if (MediaRecorder.isTypeSupported(candidate)) return candidate;
    }
    return undefined;
}

function createMediaRecorder(stream: MediaStream): MediaRecorder {
    const mimeType = pickRecorderMimeType();
    if (mimeType) {
        try {
            return new MediaRecorder(stream, { mimeType });
        } catch {
            /* fallback below */
        }
    }
    return new MediaRecorder(stream);
}

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
    const stopRecordingRef = useRef<(() => void) | null>(null);

    const sttSupported = isSpeechRecognitionSupported();

    const resetRecording = useCallback(() => {
        transcriptSessionRef.current?.stop();
        transcriptSessionRef.current = null;
        setResult(null);
        setLiveTranscript('');
        transcriptRef.current = '';
        setAudioUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setRecordingTime(0);
        durationRef.current = 0;
        setSavedToNotepad(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch {
                /* ignore */
            }
        }
        mediaRecorderRef.current = null;
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setIsRecording(false);
    }, []);

    const finalizeBlob = useCallback(
        async (blob: Blob) => {
            const durationSeconds = durationRef.current;
            if (durationSeconds < MIN_VOICE_DURATION_SEC) {
                SmartToast.info('التسجيل قصير جداً — حاول مجدداً');
                resetRecording();
                return;
            }

            if (blob.size === 0) {
                SmartToast.error('لم يُسجَّل صوت — تحقق من المايكروفون');
                resetRecording();
                return;
            }

            const url = URL.createObjectURL(blob);
            setAudioUrl(url);

            const transcript = (transcriptRef.current || transcriptSessionRef.current?.getTranscript() || '').trim();
            if (!onSaveVoice) {
                setSavedToNotepad(false);
                setResult(
                    transcript
                        ? transcript
                        : 'تم حفظ التسجيل محلياً — افتح المفكرة للاستماع.',
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
                        : 'تم حفظ التسجيل في المفكرة — يمكنك تشغيله من قائمة الملاحظات.',
                );
            } catch {
                SmartToast.error('تعذّر حفظ التسجيل في المفكرة');
                setSavedToNotepad(false);
            } finally {
                setIsSaving(false);
            }
        },
        [onSaveVoice, resetRecording],
    );

    const stopRecording = useCallback(() => {
        transcriptSessionRef.current?.stop();
        transcriptSessionRef.current = null;
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            try {
                mediaRecorderRef.current.stop();
            } catch {
                /* ignore */
            }
        } else {
            setIsRecording(false);
        }
    }, []);

    stopRecordingRef.current = stopRecording;

    const startRecording = useCallback(async () => {
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
            SmartToast.warning('التسجيل الصوتي غير مدعوم في هذا المتصفح');
            return;
        }
        if (typeof MediaRecorder === 'undefined') {
            SmartToast.warning('مسجّل الصوت غير مدعوم — جرّب Chrome أو Edge');
            return;
        }

        try {
            resetRecording();

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true },
            });
            streamRef.current = stream;
            chunksRef.current = [];
            transcriptRef.current = '';
            setLiveTranscript('');

            const recorder = createMediaRecorder(stream);
            mediaRecorderRef.current = recorder;
            mimeTypeRef.current = recorder.mimeType || pickRecorderMimeType() || 'audio/webm';

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onerror = () => {
                SmartToast.error('تعذّر إكمال التسجيل');
                resetRecording();
            };

            recorder.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
                mediaRecorderRef.current = null;
                setIsRecording(false);
                const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
                void finalizeBlob(blob);
            };

            recorder.start(500);
            setIsRecording(true);
            setRecordingTime(0);
            durationRef.current = 0;
            setResult(null);
            setSavedToNotepad(false);

            if (sttSupported) {
                window.setTimeout(() => {
                    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
                    transcriptSessionRef.current = createArabicTranscriptSession((text) => {
                        transcriptRef.current = text;
                        setLiveTranscript(text);
                    });
                    transcriptSessionRef.current?.start();
                }, 400);
            }
        } catch (err) {
            const name = err instanceof DOMException ? err.name : '';
            if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                SmartToast.warning('يُرجى السماح بالمايكروفون من إعدادات المتصفح');
            } else if (name === 'NotFoundError') {
                SmartToast.warning('لم يُعثر على مايكروفون');
            } else {
                SmartToast.warning('تعذّر بدء التسجيل — تحقق من المايكروفون');
            }
            resetRecording();
        }
    }, [finalizeBlob, resetRecording, sttSupported]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval> | undefined;
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
        return () => {
            if (timer) clearInterval(timer);
        };
    }, [isRecording]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            transcriptSessionRef.current?.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const handlePrimaryAction = () => {
        if (isSaving) return;
        if (isRecording) {
            stopRecording();
            return;
        }
        if (savedToNotepad) {
            onClose();
            return;
        }
        if (result) {
            resetRecording();
            return;
        }
        void startRecording();
    };

    const requestClose = useCallback(() => {
        if (isSaving) return;
        if (isRecording) {
            stopRecording();
            return;
        }
        onClose();
    }, [isSaving, isRecording, stopRecording, onClose]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') requestClose();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [requestClose]);

    const primaryBtnClass = isRecording ? PEARL_BTN_STOP : PEARL_BTN_GOLD;

    return createPortal(
        <div
            className={`${VAULT_SHEET_OVERLAY_VIEWPORT} p-4`}
            dir="rtl"
            onClick={requestClose}
            role="presentation"
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
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#D9CFC0]/12 bg-[#132238]/85 text-[#C9BCA8]/70 hover:border-[#B87333]/24 hover:bg-[#132238] hover:text-[#F4F0E8] transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="space-y-4 bg-[#0E1B2E] p-5">
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
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D9CFC0]/12 bg-[#132238]/55 py-2.5 text-xs font-bold text-[#C9BCA8] transition hover:border-[#B87333]/20 hover:bg-[#132238]/85"
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
};
