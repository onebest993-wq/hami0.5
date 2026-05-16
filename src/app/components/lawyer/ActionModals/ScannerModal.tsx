import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, Scan, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import { SmartToast } from '@/app/components/ui/SmartToast';

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

    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
        };
    }, [stream]);

    const startCamera = useCallback(async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setPhase('camera');
        } catch {
            setError('تعذر الوصول إلى الكاميرا. يرجى رفع صورة من الجهاز بدلاً من ذلك.');
            setPhase('idle');
        }
    }, []);

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
    }, []);

    const uploadScan = useCallback(async () => {
        if (!capturedImage) return;
        setPhase('uploading');
        setError(null);

        try {
            const blob = await (await fetch(capturedImage)).blob();
            const file = new File([blob], `scan_${Date.now()}.jpg`, { type: 'image/jpeg' });

            const uploaded = await LawyerStorage.uploadSmartFile(userId, file, 'scans');

            const resultData: ScannerResult = {
                text: 'تم مسح المستند ضوئياً',
                image: capturedImage,
                storagePath: uploaded.path,
                signedUrl: uploaded.downloadUrl,
            };

            setResult(resultData);
            setPhase('result');
            SmartToast.success('تم رفع المستند بنجاح');
            onScanComplete?.(resultData);
        } catch {
            setError('فشل رفع المستند. يرجى المحاولة مرة أخرى.');
            setPhase('capturing');
        }
    }, [capturedImage, userId, onScanComplete]);

    const retake = useCallback(() => {
        setCapturedImage(null);
        setResult(null);
        setError(null);
        setPhase('idle');
    }, []);

    const modal = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center pointer-events-auto">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="bg-[#1A1E2E] w-full max-w-lg mx-4 rounded-2xl border border-[#E6C673]/20 shadow-2xl overflow-hidden relative z-10"
                >
                    {/* Header */}
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#131620]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E6C673]/10 rounded-lg text-[#E6C673]">
                                <Scan size={20} />
                            </div>
                            <h3 className="text-white font-bold text-lg">ماسح المستندات الذكي</h3>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-5">
                        {phase === 'idle' && (
                            <div className="flex flex-col gap-4">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                        {error}
                                    </div>
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
                            </div>
                        )}

                        {phase === 'camera' && (
                            <div className="flex flex-col gap-4">
                                <div className="relative rounded-xl overflow-hidden bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-[400px] object-cover"
                                    />
                                </div>
                                <button type="button"
                                    onClick={captureFromCamera}
                                    className="flex items-center justify-center gap-3 bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-4 rounded-xl transition-all"
                                >
                                    <Camera size={22} />
                                    التقاط الصورة
                                </button>
                            </div>
                        )}

                        {phase === 'capturing' && capturedImage && (
                            <div className="flex flex-col gap-4">
                                <div className="relative rounded-xl overflow-hidden bg-black">
                                    <img src={capturedImage} alt="ممسوح ضوئياً" className="w-full h-[400px] object-contain" />
                                </div>
                                <div className="flex gap-3">
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
                                </div>
                            </div>
                        )}

                        {phase === 'uploading' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <Loader2 size={48} className="text-[#E6C673] animate-spin" />
                                <p className="text-white/60 text-sm">جاري رفع المستند إلى الخادم...</p>
                            </div>
                        )}

                        {phase === 'result' && result && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-center gap-3 py-6">
                                    <CheckCircle2 size={48} className="text-emerald-500" />
                                    <div>
                                        <p className="text-white font-bold text-lg">تم المسح والرفع بنجاح</p>
                                        <p className="text-white/40 text-xs">تم حفظ المستند في المخزن</p>
                                    </div>
                                </div>
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
                            </div>
                        )}
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                </motion.div>
            </AnimatePresence>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(modal, document.body);
};
