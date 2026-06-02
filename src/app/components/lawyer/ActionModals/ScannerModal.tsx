import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, Scan, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { LawyerStorage, SmartVaultDB, uuidv4 } from '@/app/services/lawyer-cloud';
import { inferTags, inferDocType } from '@/app/components/lawyer/hooks/useSmartVault';
import { extractTextFromDocumentImage, ocrFallbackMessage } from '@/app/services/documentOcrService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';

interface ScannerResult {
    text: string;
    image: string;
    storagePath?: string;
    signedUrl?: string;
}

interface ScannerModalProps {
    onClose: () => void;
    onScanComplete?: (result: ScannerResult) => void;
    userId: string;
}

type ScanPhase = 'idle' | 'camera' | 'capturing' | 'uploading' | 'result';

export const ScannerModal = ({ onClose, onScanComplete, userId }: ScannerModalProps) => {
    const [phase, setPhase] = useState<ScanPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ScannerResult | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const uid = userId?.trim() || '';

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, [stream]);

    useEffect(() => {
        if (phase !== 'camera' || !stream) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().catch(() => {});
    }, [phase, stream]);

    const ensureSignedIn = useCallback((): boolean => {
        if (uid) return true;
        SmartToast.error('يرجى تسجيل الدخول أولاً لرفع المستندات');
        return false;
    }, [uid]);

    const startCamera = useCallback(async () => {
        if (!ensureSignedIn()) return;
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            setPhase('camera');
        } catch {
            setError('تعذر الوصول إلى الكاميرا. يرجى رفع صورة من الجهاز بدلاً من ذلك.');
            setPhase('idle');
        }
    }, [ensureSignedIn]);

    const captureFromCamera = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        if (stream) {
            stream.getTracks().forEach(t => t.stop());
            setStream(null);
        }
        setPhase('capturing');
    }, [stream]);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (!ensureSignedIn()) return;
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            SmartToast.error('يرجى اختيار صورة فقط');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setCapturedImage(reader.result as string);
            setPhase('capturing');
        };
        reader.readAsDataURL(file);
    }, [ensureSignedIn]);

    const uploadScan = useCallback(async () => {
        if (!capturedImage) return;
        if (!ensureSignedIn()) return;
        setPhase('uploading');
        setError(null);

        try {
            const blob = await (await fetch(capturedImage)).blob();
            const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

            const [uploaded, ocr] = await Promise.all([
                LawyerStorage.uploadSmartFile(uid, file, 'scans'),
                extractTextFromDocumentImage(capturedImage),
            ]);

            const ocrText = ocr.text.trim();
            const autoSummary = getLawyerSettingsSnapshot().workflow.autoSummary;
            const title = `مسح ضوئي ${new Date().toLocaleDateString('ar-IQ')}`;
            const docId = uuidv4();

            await SmartVaultDB.saveDoc({
                id: docId,
                title,
                type: inferDocType(file.type),
                tags: inferTags(title),
                authorId: uid,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                fileSize: file.size,
                fileName: file.name,
                mimeType: file.type,
                storagePath: uploaded.path,
                signedUrl: uploaded.downloadUrl || null,
                isProcessing: false,
                aiSummary: autoSummary && ocrText ? ocrText.slice(0, 2000) : null,
                boundDossierId: null,
            });

            const displayText = ocrText || ocrFallbackMessage(true);

            const resultData: ScannerResult = {
                text: displayText,
                image: capturedImage,
                storagePath: uploaded.path,
                signedUrl: uploaded.downloadUrl,
            };

            setResult(resultData);
            setPhase('result');
            SmartToast.success(
                ocrText ? 'تم رفع المستند واستخراج النص بنجاح' : 'تم رفع المستند وإضافته للمخزن',
            );
            onScanComplete?.(resultData);
        } catch {
            setError('فشل رفع المستند. يرجى المحاولة مرة أخرى.');
            setPhase('capturing');
        }
    }, [capturedImage, uid, onScanComplete, ensureSignedIn]);

    const retake = useCallback(() => {
        setCapturedImage(null);
        setResult(null);
        setError(null);
        setPhase('idle');
    }, []);

    const modal = (
        <motion.div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto">
            <AnimatePresence>
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                <motion.div
                    key="panel"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-[#1A1E2E] w-full max-w-lg mx-4 rounded-2xl border border-[#E6C673]/20 shadow-2xl overflow-hidden relative z-10"
                >
                    {/* Header */}
                    <motion.div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#131620]">
                        <div className="flex items-center gap-3">
                            <motion.div className="p-2 bg-[#E6C673]/10 rounded-lg text-[#E6C673]">
                                <Scan size={20} />
                            </motion.div>
                            <h3 className="text-white font-bold text-lg">ماسح المستندات الذكي</h3>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </motion.div>

                    {/* Body */}
                    <motion.div className="p-5">
                        {phase === 'idle' && (
                            <motion.div className="flex flex-col gap-4">
                                {error && (
                                    <motion.div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                        {error}
                                    </motion.div>
                                )}
                                <button type="button"
                                    onClick={startCamera}
                                    className="flex items-center justify-center gap-3 bg-[#E6C673]/10 hover:bg-[#E6C673]/20 border border-[#E6C673]/30 rounded-xl py-5 text-[#E6C673] font-bold transition-all"
                                >
                                    <Camera size={24} />
                                    فتح الكاميرا
                                </button>
                                <button type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-5 text-white font-bold transition-all"
                                >
                                    <Upload size={24} />
                                    رفع صورة من الجهاز
                                </button>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />
                                <p className="text-white/30 text-xs text-center">يدعم الصور فقط — JPG, PNG</p>
                            </motion.div>
                        )}

                        {phase === 'camera' && (
                            <motion.div className="flex flex-col gap-4">
                                <motion.div className="relative rounded-xl overflow-hidden bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-[400px] object-cover"
                                    />
                                </motion.div>
                                <button type="button"
                                    onClick={captureFromCamera}
                                    className="flex items-center justify-center gap-3 bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-4 rounded-xl transition-all"
                                >
                                    <Camera size={22} />
                                    التقاط الصورة
                                </button>
                            </motion.div>
                        )}

                        {phase === 'capturing' && capturedImage && (
                            <motion.div className="flex flex-col gap-4">
                                <motion.div className="relative rounded-xl overflow-hidden bg-black">
                                    <img src={capturedImage} alt="ممسوح ضوئياً" className="w-full h-[400px] object-contain" />
                                </motion.div>
                                <motion.div className="flex gap-3">
                                    <button type="button"
                                        onClick={retake}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        <X size={18} />
                                        إعادة
                                    </button>
                                    <button type="button"
                                        onClick={uploadScan}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-3 rounded-xl transition-all"
                                    >
                                        <Upload size={18} />
                                        رفع المستند
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}

                        {phase === 'uploading' && (
                            <motion.div className="flex flex-col items-center justify-center py-16 gap-4">
                                <Loader2 size={48} className="text-[#E6C673] animate-spin" />
                                <p className="text-white/60 text-sm">جاري رفع المستند إلى الخادم...</p>
                            </motion.div>
                        )}

                        {phase === 'result' && result && (
                            <motion.div className="flex flex-col gap-4">
                                <motion.div className="flex items-center justify-center gap-3 py-6">
                                    <CheckCircle2 size={48} className="text-emerald-500" />
                                    <motion.div>
                                        <p className="text-white font-bold text-lg">تم المسح والرفع بنجاح</p>
                                        <p className="text-white/40 text-xs">تم حفظ المستند في المخزن الذكي</p>
                                    </motion.div>
                                </motion.div>
                                {result.text ? (
                                    <div className="max-h-40 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 text-right">
                                        <p className="text-white/50 text-[10px] mb-1">النص المستخرج</p>
                                        <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{result.text}</p>
                                    </div>
                                ) : null}
                                {result.signedUrl && (
                                    <a
                                        href={result.signedUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-3 text-white text-sm transition-all"
                                    >
                                        <FileText size={16} />
                                        فتح المستند
                                    </a>
                                )}
                                <button type="button"
                                    onClick={retake}
                                    className="flex items-center justify-center gap-2 bg-[#E6C673]/10 hover:bg-[#E6C673]/20 border border-[#E6C673]/30 rounded-xl py-3 text-[#E6C673] text-sm font-bold transition-all"
                                >
                                    <Camera size={16} />
                                    مسح مستند آخر
                                </button>
                            </motion.div>
                        )}
                    </motion.div>

                    <canvas ref={canvasRef} className="hidden" />
                </motion.div>
            </AnimatePresence>
        </motion.div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modal, document.body);
};
