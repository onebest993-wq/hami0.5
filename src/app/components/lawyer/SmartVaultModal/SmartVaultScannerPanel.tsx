import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, Upload, Scan, Loader2, CheckCircle2, ChevronLeft, Eye } from 'lucide-react';
import { saveScannedImageToVault } from '@/app/services/vaultUploadService';
import { SmartVaultDB, type SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { extractTextFromDocumentImage, ocrFallbackMessage } from '@/app/services/documentOcrService';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsRuntime';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';

export interface ScannerSaveResult {
    text: string;
    image: string;
    doc: SmartVaultDoc;
    storagePath?: string;
    signedUrl?: string | null;
    localOnly: boolean;
}

interface SmartVaultScannerPanelProps {
    userId: string;
    onClose: () => void;
    onSaved?: (result: ScannerSaveResult) => void;
    onViewDoc?: (doc: SmartVaultDoc) => void;
    onCategoryUsed?: (name: string) => void;
    categorySuggestions?: string[];
    standalone?: boolean;
}

type ScanPhase = 'idle' | 'camera' | 'capturing' | 'uploading' | 'result';

function isImageSelection(file: File): boolean {
    if (file.type.startsWith('image/')) return true;
    return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
}

export const SmartVaultScannerPanel: React.FC<SmartVaultScannerPanelProps> = ({
    userId,
    onClose,
    onSaved,
    onViewDoc,
    onCategoryUsed,
    categorySuggestions = [],
    standalone = false,
}) => {
    const [phase, setPhase] = useState<ScanPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ScannerSaveResult | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [scanTitle, setScanTitle] = useState('');
    const [scanNote, setScanNote] = useState('');
    const [scanCategory, setScanCategory] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const uid = userId?.trim() || '';

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach((t) => t.stop());
        };
    }, [stream]);

    useEffect(() => {
        if (phase !== 'camera' || !stream) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        void video.play().catch(() => {});
    }, [phase, stream]);

    const stopCamera = useCallback(() => {
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
    }, [stream]);

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
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            setStream(mediaStream);
            setPhase('camera');
        } catch {
            setError('تعذر الوصول إلى الكاميرا. يمكنك رفع صورة من الجهاز.');
            setPhase('idle');
        }
    }, [ensureSignedIn]);

    const captureFromCamera = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || !video.videoWidth) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        setScanTitle(`مسح ضوئي ${new Date().toLocaleDateString('ar-IQ')}`);
        setScanNote('');
        setScanCategory('');
        stopCamera();
        setPhase('capturing');
    }, [stopCamera]);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            if (!ensureSignedIn()) return;
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (!isImageSelection(file)) {
                SmartToast.error('يرجى اختيار صورة فقط');
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    setCapturedImage(reader.result);
                    setScanTitle(`مسح ضوئي ${new Date().toLocaleDateString('ar-IQ')}`);
                    setScanNote('');
                    setScanCategory('');
                    setPhase('capturing');
                }
            };
            reader.onerror = () => SmartToast.error('تعذر قراءة الصورة');
            reader.readAsDataURL(file);
        },
        [ensureSignedIn],
    );

    const uploadScan = useCallback(async () => {
        if (!capturedImage || !ensureSignedIn()) return;
        setPhase('uploading');
        setError(null);

        try {
            const [saved, ocr] = await Promise.all([
                saveScannedImageToVault(uid, capturedImage, {
                    title: scanTitle.trim() || undefined,
                    lawyerNote: scanNote.trim() || null,
                    customCategory: scanCategory.trim() || null,
                }),
                extractTextFromDocumentImage(capturedImage),
            ]);

            const ocrText = ocr.text.trim();
            const autoSummary = getLawyerSettingsSnapshot().workflow.autoSummary;
            if (autoSummary && ocrText) {
                const summary = ocrText.slice(0, 2000);
                if (saved.doc.aiSummary !== summary) {
                    await SmartVaultDB.saveDoc({ ...saved.doc, aiSummary: summary });
                }
            }

            const displayText = ocrText || ocrFallbackMessage(true);
            const resultData: ScannerSaveResult = {
                text: displayText,
                image: capturedImage,
                doc: saved.doc,
                storagePath: saved.doc.storagePath,
                signedUrl: saved.doc.signedUrl,
                localOnly: saved.localOnly,
            };

            setResult(resultData);
            setPhase('result');
            if (scanCategory.trim()) onCategoryUsed?.(scanCategory.trim());
            SmartToast.success(
                saved.localOnly
                    ? 'تم حفظ المسح محلياً في المخزن'
                    : ocrText
                      ? 'تم رفع المستند واستخراج النص بنجاح'
                      : 'تم رفع المستند وإضافته للمخزن',
            );
            onSaved?.(resultData);
        } catch (err) {
            if (err instanceof Error && err.message === 'vault persist failed') {
                SmartToast.error('تعذر حفظ المسح — قد تكون مساحة التخزين ممتلئة');
            } else {
                setError('فشل حفظ المستند. تحقق من الاتصال أو جرّب صورة أصغر.');
            }
            setPhase('capturing');
        }
    }, [capturedImage, uid, onSaved, onCategoryUsed, ensureSignedIn, scanTitle, scanNote, scanCategory]);

    const retake = useCallback(() => {
        stopCamera();
        setCapturedImage(null);
        setScanTitle('');
        setScanNote('');
        setScanCategory('');
        setResult(null);
        setError(null);
        setPhase('idle');
    }, [stopCamera]);

    const handleClose = useCallback(() => {
        stopCamera();
        onClose();
    }, [stopCamera, onClose]);

    const shellClass = standalone
        ? 'fixed inset-0 z-[100000] flex items-center justify-center pointer-events-auto'
        : 'absolute inset-0 z-[45] flex items-end sm:items-center justify-center pointer-events-auto';

    const panelClass = standalone
        ? 'bg-[#1A1E2E] w-full max-w-lg mx-4 rounded-2xl border border-[#E6C673]/20 shadow-2xl overflow-hidden relative z-10 max-h-[90vh] flex flex-col'
        : 'bg-[#1A1E2E] w-full sm:max-w-lg sm:mx-4 rounded-t-2xl sm:rounded-2xl border border-[#E6C673]/20 shadow-2xl overflow-hidden relative z-10 max-h-[85vh] flex flex-col';

    return (
        <AnimatePresence>
            <motion.div
                key="scanner-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={shellClass}
                dir="rtl"
            >
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/75 backdrop-blur-sm"
                />

                <motion.div
                    initial={standalone ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 40 }}
                    animate={standalone ? { opacity: 1, scale: 1 } : { opacity: 1, y: 0 }}
                    exit={standalone ? { opacity: 0, scale: 0.95 } : { opacity: 0, y: 40 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                    className={panelClass}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="shrink-0 px-5 py-4 border-b border-white/5 flex items-center justify-between bg-[#131620]">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-[#E6C673]/10 rounded-lg text-[#E6C673]">
                                <Scan size={20} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base">ماسح المستندات</h3>
                                <p className="text-white/35 text-[10px]">يُحفظ مباشرة في المخزن الذكي</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 hover:bg-white/5 rounded-full text-white/50 hover:text-white transition-colors"
                        >
                            {standalone ? <X size={20} /> : <ChevronLeft size={20} />}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                        {phase === 'idle' && (
                            <div className="flex flex-col gap-4">
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={startCamera}
                                    className="flex items-center justify-center gap-3 bg-[#E6C673]/10 hover:bg-[#E6C673]/20 border border-[#E6C673]/30 rounded-xl py-5 text-[#E6C673] font-bold transition-all"
                                >
                                    <Camera size={24} />
                                    فتح الكاميرا
                                </button>
                                <button
                                    type="button"
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
                                <p className="text-white/30 text-xs text-center">JPG · PNG · WEBP · HEIC</p>
                            </div>
                        )}

                        {phase === 'camera' && (
                            <div className="flex flex-col gap-4">
                                <div className="relative rounded-xl overflow-hidden bg-black">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-[min(400px,50vh)] object-cover"
                                    />
                                </div>
                                <button
                                    type="button"
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
                                    <img
                                        src={capturedImage}
                                        alt="معاينة المسح"
                                        className="w-full h-[min(280px,40vh)] object-contain"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="text"
                                        value={scanTitle}
                                        onChange={(e) => setScanTitle(e.target.value)}
                                        placeholder="عنوان المسح"
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#E6C673]/40"
                                    />
                                    <textarea
                                        value={scanNote}
                                        onChange={(e) => setScanNote(e.target.value)}
                                        placeholder="وصف / تذكير: لمن هذا المستند؟"
                                        rows={2}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#E6C673]/40 resize-none"
                                    />
                                    <VaultCategoryPicker
                                        id="vault-scan-category"
                                        categories={categorySuggestions}
                                        value={scanCategory}
                                        onChange={setScanCategory}
                                        onAddCategory={onCategoryUsed}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={retake}
                                        className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-all"
                                    >
                                        <X size={18} />
                                        إعادة
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void uploadScan()}
                                        className="flex-1 flex items-center justify-center gap-2 bg-[#E6C673] hover:bg-[#D4B360] text-black font-bold py-3 rounded-xl transition-all"
                                    >
                                        <Upload size={18} />
                                        حفظ في المخزن
                                    </button>
                                </div>
                            </div>
                        )}

                        {phase === 'uploading' && (
                            <div className="flex flex-col items-center justify-center py-16 gap-4">
                                <Loader2 size={48} className="text-[#E6C673] animate-spin" />
                                <p className="text-white/60 text-sm">جاري حفظ المستند في المخزن...</p>
                            </div>
                        )}

                        {phase === 'result' && result && (
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-center gap-3 py-4">
                                    <CheckCircle2 size={44} className="text-emerald-500 shrink-0" />
                                    <div>
                                        <p className="text-white font-bold text-lg">تم الحفظ بنجاح</p>
                                        <p className="text-white/40 text-xs">
                                            {result.localOnly ? 'محفوظ محلياً في المخزن' : 'تمت إضافته للمخزن الذكي'}
                                        </p>
                                    </div>
                                </div>
                                {result.text ? (
                                    <div className="max-h-40 overflow-y-auto rounded-xl bg-white/5 border border-white/10 p-3 text-right">
                                        <p className="text-white/50 text-[10px] mb-1">النص المستخرج</p>
                                        <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{result.text}</p>
                                    </div>
                                ) : null}
                                {result.doc ? (
                                    <button
                                        type="button"
                                        onClick={() => onViewDoc?.(result.doc)}
                                        className="flex items-center justify-center gap-2 bg-[#E6C673]/15 hover:bg-[#E6C673]/25 border border-[#E6C673]/35 rounded-xl py-3 text-[#E6C673] text-sm font-bold transition-all"
                                    >
                                        <Eye size={16} />
                                        معاينة داخل التطبيق
                                    </button>
                                ) : null}
                                <button
                                    type="button"
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
            </motion.div>
        </AnimatePresence>
    );
};
