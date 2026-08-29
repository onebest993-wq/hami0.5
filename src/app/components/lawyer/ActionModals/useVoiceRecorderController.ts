import { useState, useEffect, useRef, useCallback } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import type { VoiceNoteSavePayload } from '@/app/components/lawyer/commandCenterTypes';
import {
    createArabicTranscriptSession,
    isSpeechRecognitionSupported,
} from '@/app/services/voice/speechTranscription';
import {
    requestMicrophoneStream,
    resolveMicrophoneAccessMessage,
    queryMicrophonePermission,
    watchMicrophonePermission,
    type MicrophoneAccessErrorCode,
    type MicrophonePermissionStatus,
} from '@/app/services/platform/requestMicrophoneStream';
import {
    clearPendingMicrophoneStream,
    consumePendingMicrophoneStream,
    hasLiveMicrophoneStream,
} from '@/app/services/platform/microphoneSession';
import { subscribeCaptureBackgroundRelease } from '@/app/services/platform/mediaCaptureBackgroundRelease';
import { createMediaRecorder, pickRecorderMimeType } from './voiceRecorderMedia';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { registerVoiceRecorderEscape } from './voiceRecorderEscapeBridge';
import {
    MAX_VOICE_DURATION_SEC,
    MIN_VOICE_DURATION_SEC,
} from '@/app/services/voice/voiceRecordingLimits';
import { PEARL_BTN_GOLD, PEARL_BTN_STOP } from './voiceRecorderChrome';

export type VoiceRecorderControllerArgs = {
    onClose: () => void;
    onSaveVoice?: (payload: VoiceNoteSavePayload) => void | Promise<void>;
};

export function useVoiceRecorderController({ onClose, onSaveVoice }: VoiceRecorderControllerArgs) {
    const [isRecording, setIsRecording] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [savedToNotepad, setSavedToNotepad] = useState(false);
    const [micPermission, setMicPermission] = useState<MicrophonePermissionStatus>('prompt');
    const [micReady, setMicReady] = useState(false);

    const showMicPermissionBanner = micPermission === 'denied';
    const showMicPermissionHint = micPermission === 'prompt' && !micReady;

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

    const refreshMicPermission = useCallback(async () => {
        const status = await queryMicrophonePermission();
        setMicPermission(status);
        return status;
    }, []);

    const startRecording = useCallback(async () => {
        if (typeof MediaRecorder === 'undefined') {
            SmartToast.warning('مسجّل الصوت غير مدعوم — جرّب Chrome أو Edge');
            return;
        }

        try {
            let stream = streamRef.current;
            const hasLiveStream = hasLiveMicrophoneStream(stream);

            if (!hasLiveStream) {
                resetRecording();
                stream = await requestMicrophoneStream();
                streamRef.current = stream;
            } else {
                chunksRef.current = [];
                transcriptRef.current = '';
                setLiveTranscript('');
                setAudioUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return null;
                });
                setRecordingTime(0);
                durationRef.current = 0;
                setResult(null);
                setSavedToNotepad(false);
            }

            chunksRef.current = [];
            transcriptRef.current = '';
            setLiveTranscript('');

            if (!stream) return;
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
            setMicPermission('granted');
            setMicReady(true);
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
            const code = (err as { hamiCode?: MicrophoneAccessErrorCode }).hamiCode;
            if (code === 'denied') setMicPermission('denied');
            SmartToast.warning(resolveMicrophoneAccessMessage(err, code));
            resetRecording();
        }
    }, [finalizeBlob, resetRecording, sttSupported]);

    useEffect(() => {
        let cancelled = false;
        const pending = consumePendingMicrophoneStream();
        if (pending && hasLiveMicrophoneStream(pending)) {
            streamRef.current = pending;
            setMicPermission('granted');
            setMicReady(true);
        } else {
            pending?.getTracks().forEach((track) => track.stop());
            void refreshMicPermission().then((status) => {
                if (!cancelled) {
                    setMicPermission(status);
                    setMicReady(status === 'granted');
                }
            });
        }
        const stopWatch = watchMicrophonePermission((status) => {
            if (!cancelled) {
                setMicPermission(status);
                if (status === 'granted') setMicReady(true);
            }
        });
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            void refreshMicPermission();
        };
        document.addEventListener('visibilitychange', onVisible);
        const unsubBackground = subscribeCaptureBackgroundRelease(() => {
            transcriptSessionRef.current?.stop();
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
            setMicReady(false);
            clearPendingMicrophoneStream();
        });
        return () => {
            cancelled = true;
            stopWatch();
            document.removeEventListener('visibilitychange', onVisible);
            unsubBackground();
        };
    }, [refreshMicPermission]);

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
            if (e.key !== 'Escape') return;
            e.preventDefault();
            e.stopPropagation();
            requestClose();
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterEscape = registerVoiceRecorderEscape(() => {
            requestClose();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterEscape();
        };
    }, [requestClose]);

    useEffect(() => {
        return registerNativeBackHandler(() => {
            requestClose();
            return true;
        });
    }, [requestClose]);

    return {
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
        primaryBtnClass: isRecording ? PEARL_BTN_STOP : PEARL_BTN_GOLD,
        requestClose,
        resetRecording,
        startRecording,
        handlePrimaryAction,
    };
}
