import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { saveScannedImageToVault } from '@/app/services/vaultUploadService';
import { REPOSITORY_ACTION_CATEGORY } from '@/app/services/vaultCustomCategories';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { beginPrivacySensitiveSurface, endPrivacySensitiveSurface } from '@/app/runtime/privacyScreenSession';
import {
    canvasToJpegBlob,
    isE2eScannerCameraBypassEnabled,
    paintScannerCaptureCanvas,
    requestScannerCameraStream,
    resolveCameraAccessMessage,
    subscribeScannerCameraBackgroundRelease,
} from './scannerCamera';

export interface ScannerSaveResult {
    text: string;
    image: string;
    doc: SmartVaultDoc;
    storagePath?: string;
    signedUrl?: string | null;
    localOnly: boolean;
}

export type ScanPhase = 'idle' | 'camera' | 'capturing' | 'uploading' | 'result';

type UseSmartVaultScannerParams = {
    userId: string;
    onClose: () => void;
    onSaved?: (result: ScannerSaveResult) => void;
    onCategoryUsed?: (name: string) => void;
};

export function useSmartVaultScanner({
    userId,
    onClose,
    onSaved,
    onCategoryUsed,
}: UseSmartVaultScannerParams) {
    const [phase, setPhase] = useState<ScanPhase>('idle');
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ScannerSaveResult | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [scanTitle, setScanTitle] = useState('');
    const [scanNote, setScanNote] = useState('');
    const [scanCategory, setScanCategory] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const saveInFlightRef = useRef(false);
    const capturedBlobRef = useRef<Blob | null>(null);
    const capturedImageRef = useRef<string | null>(null);

    const uid = userId?.trim() || '';
    capturedImageRef.current = capturedImage;

    const revokePreviewUrl = useCallback((url: string | null) => {
        if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
    }, []);

    useEffect(() => {
        return () => {
            revokePreviewUrl(capturedImageRef.current);
        };
    }, [revokePreviewUrl]);

    useEffect(() => {
        return () => {
            stream?.getTracks().forEach((t) => t.stop());
            void endPrivacySensitiveSurface();
        };
    }, [stream]);

    useEffect(() => {
        if (phase !== 'camera' || !stream) return;
        const video = videoRef.current;
        if (!video) return;
        try {
            video.srcObject = stream;
        } catch {
            /* بث غير قياسي لا يُسقط الشاشة — الالتقاط يستخدم احتياطي المقاس */
        }
        const play = () => {
            void video.play().catch(() => undefined);
        };
        video.addEventListener('loadedmetadata', play);
        play();
        return () => {
            video.removeEventListener('loadedmetadata', play);
        };
    }, [phase, stream]);

    const stopCamera = useCallback(() => {
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
        void endPrivacySensitiveSurface();
    }, [stream]);

    useEffect(() => {
        if (phase !== 'camera') return;
        return subscribeScannerCameraBackgroundRelease(() => {
            stopCamera();
            setPhase('idle');
        });
    }, [phase, stopCamera]);

    const ensureSignedIn = useCallback((): boolean => {
        if (uid) return true;
        SmartToast.error('يرجى تسجيل الدخول أولاً لرفع المستندات');
        return false;
    }, [uid]);

    const startCamera = useCallback(async () => {
        if (!ensureSignedIn()) return;
        setError(null);
        await beginPrivacySensitiveSurface();
        try {
            if (isE2eScannerCameraBypassEnabled()) {
                try {
                    setStream(typeof MediaStream === 'function' ? new MediaStream() : null);
                } catch {
                    setStream(null);
                }
                setPhase('camera');
                return;
            }
            const mediaStream = await requestScannerCameraStream();
            setStream(mediaStream);
            setPhase('camera');
        } catch (error) {
            await endPrivacySensitiveSurface();
            setError(
                error instanceof Error && error.message === 'UNSUPPORTED_CAMERA_API'
                    ? 'هذا المتصفح أو الجهاز لا يدعم فتح الكاميرا هنا.'
                    : resolveCameraAccessMessage(error),
            );
            setPhase('idle');
        }
    }, [ensureSignedIn]);

    const captureFromCamera = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        const size = paintScannerCaptureCanvas(video, canvas);
        if (!size) {
            SmartToast.error('الكاميرا لم تجهز بعد — انتظر لحظة ثم أعد المحاولة');
            return;
        }
        void canvasToJpegBlob(canvas)
            .then((blob) => {
                const preview = URL.createObjectURL(blob);
                capturedBlobRef.current = blob;
                setCapturedImage((prev) => {
                    if (prev && prev !== preview) revokePreviewUrl(prev);
                    return preview;
                });
                setScanTitle(`مسح ضوئي ${new Date().toLocaleDateString('ar-IQ')}`);
                setScanNote('');
                setScanCategory('');
                stopCamera();
                setPhase('capturing');
            })
            .catch(() => {
                SmartToast.error('تعذر التقاط الصورة. أعد المحاولة.');
            });
    }, [revokePreviewUrl, stopCamera]);

    const uploadScan = useCallback(async () => {
        if (!capturedImage || !ensureSignedIn() || saveInFlightRef.current) return;
        saveInFlightRef.current = true;
        setPhase('uploading');
        setError(null);

        try {
            const imageSource = capturedBlobRef.current ?? capturedImage;
            const saved = await saveScannedImageToVault(uid, imageSource, {
                title: scanTitle.trim() || undefined,
                lawyerNote: scanNote.trim() || null,
                customCategory: scanCategory.trim() || REPOSITORY_ACTION_CATEGORY.scan,
            });

            const resultData: ScannerSaveResult = {
                text: '',
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
                    : 'تم رفع المستند وإضافته للمخزن',
            );
            startTransition(() => {
                onSaved?.(resultData);
            });
        } catch (err) {
            if (err instanceof Error && err.message === 'vault persist failed') {
                SmartToast.error('تعذر حفظ المسح — قد تكون مساحة التخزين ممتلئة');
            } else {
                setError('فشل حفظ المستند. تحقق من الاتصال ثم أعد المحاولة.');
            }
            setPhase('capturing');
        } finally {
            saveInFlightRef.current = false;
        }
    }, [capturedImage, uid, onSaved, onCategoryUsed, ensureSignedIn, scanTitle, scanNote, scanCategory]);

    const retake = useCallback(() => {
        stopCamera();
        setCapturedImage((prev) => {
            revokePreviewUrl(prev);
            return null;
        });
        capturedBlobRef.current = null;
        setScanTitle('');
        setScanNote('');
        setScanCategory('');
        setResult(null);
        setError(null);
        setPhase('idle');
    }, [revokePreviewUrl, stopCamera]);

    const handleClose = useCallback(() => {
        stopCamera();
        onClose();
    }, [stopCamera, onClose]);

    return {
        uid,
        phase,
        error,
        setError,
        result,
        capturedImage,
        scanTitle,
        setScanTitle,
        scanNote,
        setScanNote,
        scanCategory,
        setScanCategory,
        videoRef,
        canvasRef,
        startCamera,
        captureFromCamera,
        uploadScan,
        retake,
        handleClose,
    };
}
