import { useCallback, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    saveFileToVault,
    readFilePreviewUrl,
    isVaultImageFile,
    isVaultPdfFile,
    VAULT_MAX_FILE_SIZE,
    type VaultUploadKind,
} from '@/app/services/vaultUploadService';
import type { PendingUploadItem } from './types';

const MAX_FILE_SIZE = VAULT_MAX_FILE_SIZE;

type UseSmartVaultUploadParams = {
    currentUserId: string;
    loadDocs: () => Promise<void>;
    addVaultCategory: (name: string) => void;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
};

export function useSmartVaultUpload({
    currentUserId,
    loadDocs,
    addVaultCategory,
    setActiveFilter,
}: UseSmartVaultUploadParams) {
    const [isSavingMeta, setIsSavingMeta] = useState(false);
    const [pendingUpload, setPendingUpload] = useState<PendingUploadItem | null>(null);
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const resetFileInputs = useCallback(() => {
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    }, []);

    const beginNextPendingUpload = useCallback(async (files: File[], kind: VaultUploadKind) => {
        if (files.length === 0) {
            setPendingUpload(null);
            setUploadQueue([]);
            return;
        }
        const [next, ...rest] = files;
        const previewUrl = kind === 'image' ? await readFilePreviewUrl(next) : undefined;
        setUploadQueue(rest);
        setPendingUpload({ file: next, previewUrl, kind });
    }, []);

    const queueUploadFiles = useCallback(
        async (fileList: FileList | null, kind: VaultUploadKind) => {
            if (!fileList || fileList.length === 0) return;
            if (!currentUserId) {
                SmartToast.error('يرجى تسجيل الدخول أولاً لرفع الملفات');
                resetFileInputs();
                return;
            }

            const files = Array.from(fileList);
            const wrongType = files.filter((f) =>
                kind === 'image' ? !isVaultImageFile(f) : !isVaultPdfFile(f),
            );
            if (wrongType.length > 0) {
                SmartToast.error(
                    kind === 'image'
                        ? 'يرجى اختيار صورة فقط (JPG, PNG, WEBP...)'
                        : 'يرجى اختيار ملف PDF فقط',
                );
                resetFileInputs();
                return;
            }

            const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
            if (oversized.length > 0) {
                SmartToast.error(
                    `الملفات التالية تتجاوز 50MB: ${oversized.map((f) => f.name).join('، ')}`,
                );
                resetFileInputs();
                return;
            }

            try {
                await beginNextPendingUpload(files, kind);
            } catch {
                SmartToast.error('تعذر تجهيز الملف للرفع');
                resetFileInputs();
            }
        },
        [beginNextPendingUpload, currentUserId, resetFileInputs],
    );

    const handleImageUploadSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            await queueUploadFiles(e.target.files, 'image');
        },
        [queueUploadFiles],
    );

    const handlePdfUploadSelect = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            await queueUploadFiles(e.target.files, 'pdf');
        },
        [queueUploadFiles],
    );

    const cancelPendingUpload = useCallback(() => {
        setPendingUpload(null);
        setUploadQueue([]);
        resetFileInputs();
    }, [resetFileInputs]);

    const confirmPendingUpload = useCallback(
        async (meta: { title: string; lawyerNote: string; classification: string }) => {
            if (!pendingUpload || !currentUserId) return;
            setIsSavingMeta(true);
            let localOnly = false;
            const classification = meta.classification.trim();
            try {
                const saved = await saveFileToVault(currentUserId, pendingUpload.file, {
                    title: meta.title,
                    lawyerNote: meta.lawyerNote || null,
                    customCategory: classification || null,
                    tags: classification ? [classification] : [],
                });
                localOnly = saved.localOnly;
                if (classification) {
                    addVaultCategory(classification);
                    setActiveFilter(classification);
                } else {
                    setActiveFilter('الكل');
                }
            } catch (err) {
                if (err instanceof Error && err.message === 'vault persist failed') {
                    SmartToast.error('تعذر حفظ الملف على الجهاز — قد تكون مساحة التخزين ممتلئة');
                } else if (err instanceof Error && err.message === 'vault blob store unavailable') {
                    SmartToast.error('تعذر حفظ الملف الكبير — المتصفح لا يدعم التخزين المحلي');
                } else if (err instanceof Error && err.message === 'file too large') {
                    SmartToast.error('يتجاوز الحد الأقصى 50MB');
                } else {
                    SmartToast.error(`فشل رفع ${pendingUpload.file.name}`);
                }
                setIsSavingMeta(false);
                return;
            }

            setIsSavingMeta(false);
            if (uploadQueue.length > 0) {
                SmartToast.success(
                    localOnly ? 'تم الحفظ محلياً — الملف التالي' : 'تم الرفع — الملف التالي',
                );
                await beginNextPendingUpload(uploadQueue, pendingUpload.kind);
                resetFileInputs();
                await loadDocs();
                return;
            }

            setPendingUpload(null);
            setUploadQueue([]);
            resetFileInputs();
            SmartToast.success(localOnly ? 'تم حفظ الملف محلياً' : 'تم رفع الملف بنجاح');
            await loadDocs();
        },
        [
            addVaultCategory,
            beginNextPendingUpload,
            currentUserId,
            loadDocs,
            pendingUpload,
            resetFileInputs,
            setActiveFilter,
            uploadQueue,
        ],
    );

    return {
        isSavingMeta,
        pendingUpload,
        uploadQueueCount: uploadQueue.length,
        imageInputRef,
        pdfInputRef,
        handleImageUploadSelect,
        handlePdfUploadSelect,
        confirmPendingUpload,
        cancelPendingUpload,
    };
}
