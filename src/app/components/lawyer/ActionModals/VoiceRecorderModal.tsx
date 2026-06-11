import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, Mic, Square, Loader2, Sparkles, FileText, Play, Trash2
} from 'lucide-react';
import { SmartToast } from '@/app/components/ui/SmartToast';

interface VoiceRecorderModalProps {
    onClose: () => void;
}

export const VoiceRecorderModal = ({ onClose }: VoiceRecorderModalProps) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isRecording) {
            timer = setInterval(() => setRecordingTime(t => t + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isRecording]);

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (audioUrl) URL.revokeObjectURL(audioUrl);
        };
    }, [audioUrl]);

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            const recorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                stream.getTracks().forEach(t => t.stop());
                streamRef.current = null;

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const url = URL.createObjectURL(blob);
                setAudioUrl(url);

                setIsProcessing(true);
                try {
                    setResult('تم حفظ التسجيل الصوتي. أضف ملاحظة نصية يدوياً في هذه النسخة.');
                    SmartToast.success('تم حفظ التسجيل الصوتي');
                } finally {
                    setIsProcessing(false);
                }
            };

            recorder.start(250);
            setIsRecording(true);
            setRecordingTime(0);
            setResult(null);
            setAudioUrl(null);
        } catch {
            SmartToast.warning('⚠️ لم نتمكن من الوصول إلى المايكروفون. تأكد من الإذن.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const resetRecording = () => {
        setResult(null);
        setAudioUrl(null);
        setRecordingTime(0);
        setIsProcessing(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    if (!mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end justify-center sm:items-center p-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                className="bg-[#1E1E2C] w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
            >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileText className="text-rose-400" size={20} />
                        المسجل الذكي
                    </h3>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-white/10 text-white/50">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-6">
                    <AnimatePresence mode="wait">
                        {!isRecording && !isProcessing && !result && (
                            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 text-center space-y-4">
                                <div className="w-24 h-24 mx-auto rounded-full bg-rose-500/10 flex items-center justify-center">
                                    <Mic className="text-rose-400" size={40} />
                                </div>
                                <p className="text-white/60 text-sm">اضغط للتسجيل ووصف الحالة</p>
                            </motion.div>
                        )}
                        {isRecording && (
                            <motion.div key="recording" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 text-center space-y-4">
                                <div className="w-32 h-32 mx-auto relative">
                                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                                    <div className="absolute inset-0 bg-red-500/10 rounded-full animate-pulse" />
                                    <div className="absolute inset-0 m-auto w-20 h-20 bg-red-500/30 rounded-full flex items-center justify-center">
                                        <span className="text-red-400 text-xs font-bold animate-pulse">● تسجيل</span>
                                    </div>
                                </div>
                                <p className="text-white/40 text-3xl font-bold tabular-nums tracking-widest">{formatTime(recordingTime)}</p>
                            </motion.div>
                        )}
                        {isProcessing && (
                            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 text-center space-y-4">
                                <div className="w-24 h-24 mx-auto relative">
                                    <div className="absolute inset-0 border-4 border-rose-400/30 rounded-full animate-ping" />
                                    <div className="absolute inset-0 border-4 border-t-rose-400 rounded-full animate-spin" />
                                    <Loader2 className="absolute inset-0 m-auto text-rose-400 animate-spin" size={32} />
                                </div>
                                <p className="text-white/60">جاري تحليل النص واستخراج المعلومات...</p>
                            </motion.div>
                        )}
                        {result && (
                            <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4">
                                    <Sparkles className="text-rose-400 w-6 h-6 mx-auto mb-2" />
                                    <p className="text-rose-300 text-sm font-bold text-center">النص المستخرج</p>
                                </div>
                                <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                                    <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">{result}</p>
                                </div>
                                {audioUrl && (
                                    <div className="bg-black/20 rounded-xl p-3 border border-white/10 flex items-center gap-3">
                                        <Play className="text-[#D4AF37] w-5 h-5" />
                                        <audio src={audioUrl} controls className="flex-1 h-10" />
                                    </div>
                                )}
                                <button type="button"
                                    onClick={resetRecording}
                                    className="w-full py-2 rounded-xl border border-white/10 text-white/60 text-sm hover:bg-white/5 transition flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} /> تسجيل جديد
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-full h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
                            isRecording
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/30 animate-pulse'
                                : result
                                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/20'
                                    : 'bg-gradient-to-r from-rose-500 to-purple-500 text-white shadow-rose-500/30'
                        }`}
                    >
                        {isRecording ? (
                            <><Square size={20} /> إيقاف التسجيل</>
                        ) : result ? (
                            <><Sparkles size={20} /> تسجيل جديد</>
                        ) : (
                            <><Mic size={20} /> ابدأ التسجيل</>
                        )}
                    </button>
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
