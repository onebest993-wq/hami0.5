import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    saveFileToVault,
    readFilePreviewUrl,
    isVaultImageFile,
    isVaultPdfFile,
    VAULT_MAX_FILE_SIZE,
    reportVaultPersistFailure,
    type VaultUploadKind,
} from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import type { PendingUploadItem } from './types';

const MAX_FILE_SIZE = VAULT_MAX_FILE_SIZE;

type UseSmartVaultUploadParams = {
    currentUserId: string;
    prependVaultDoc: (doc: SmartVaultDoc) => void;
    addVaultCategory: (name: string) => void;
    setActiveFilter: React.Dispatch<React.SetStateAction<string>>;
    onAfterVaultSave?: () => void;
};

export function useSmartVaultUpload({
    currentUserId,
    prependVaultDoc,
    addVaultCategory,
    setActiveFilter,
    onAfterVaultSave,
}: UseSmartVaultUploadParams) {
    const [pendingUpload, setPendingUpload] = useState<PendingUploadItem | null>(null);
    const [uploadQueue, setUploadQueue] = useState<File[]>([]);
    const [isSavingMeta, setIsSavingMeta] = useState(false);
    const pendingUploadRef = useRef<PendingUploadItem | null>(null);
    const uploadQueueRef = useRef<File[]>([]);
    const isSavingMetaRef = useRef(false);
    const saveGenerationRef = useRef(0);
    const previewBlobRef = useRef<string | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const pdfInputRef = useRef<HTMLInputElement>(null);

    const revokePreviewBlob = useCallback(() => {
        revokeBlobUrlIfNeeded(previewBlobRef.current);
        previewBlobRef.current = null;
    }, []);

    useEffect(() => {
        pendingUploadRef.current = pendingUpload;
    }, [pendingUpload]);

    useEffect(() => {
        uploadQueueRef.current = uploadQueue;
    }, [uploadQueue]);

    useEffect(() => () => revokePreviewBlob(), [revokePreviewBlob]);

    const resetFileInputs = useCallback(() => {
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (pdfInputRef.current) pdfInputRef.current.value = '';
    }, []);

    const beginNextPendingUpload = useCallback((files: File[], kind: VaultUploadKind) => {
        if (files.length === 0) {
            setPendingUpload(null);
            setUploadQueue([]);
            return;
        }
        const [next, ...rest] = files;
        const previewUrl = kind === 'image' ? readFilePreviewUrl(next) : undefined;
        revokePreviewBlob();
        if (previewUrl?.startsWith('blob:')) previewBlobRef.current = previewUrl;
        setUploadQueue(rest);
        setPendingUpload({ file: next, kind, previewUrl });
        prefetchVaultBlobStore();
    }, [revokePreviewBlob]);

    const queueUploadFiles = useCallback(
        (fileList: FileList | null, kind: VaultUploadKind) => {
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

            beginNextPendingUpload(files, kind);
        },
        [beginNextPendingUpload, currentUserId, resetFileInputs],
    );

    const handleImageUploadSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
            queueUploadFiles(e.target.files, 'image');
            return Promise.resolve();
        },
        [queueUploadFiles],
    );

    const handlePdfUploadSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
            prefetchVaultBlobStore();
            queueUploadFiles(e.target.files, 'pdf');
            return Promise.resolve();
        },
        [queueUploadFiles],
    );

    const cancelPendingUpload = useCallback(() => {
        if (isSavingMetaRef.current) return;
        revokePreviewBlob();
        setPendingUpload(null);
        setUploadQueue([]);
        resetFileInputs();
    }, [resetFileInputs, revokePreviewBlob]);

    const confirmPendingUpload = useCallback(
        async (meta: { title: string; lawyerNote: string; classification: string }) => {
            if (isSavingMetaRef.current) return;

            const pending = pendingUploadRef.current ?? pendingUpload;
            const uid = currentUserId?.trim();

            if (!pending) {
                SmartToast.error('انتهت جلسة الرفع — أعد اختيار الملف');
                return;
            }
            if (!uid) {
                SmartToast.error('يرجى تسجيل الدخول أولاً لرفع الملفات');
                return;
            }

            const classification = meta.classification.trim();
            const file = pending.file;
            const kind = pending.kind;
            const queue = [...uploadQueueRef.current];
            const saveGeneration = saveGenerationRef.current + 1;
            saveGenerationRef.current = saveGeneration;

            isSavingMetaRef.current = true;
            setIsSavingMeta(true);

            try {
                const saved = await saveFileToVault(uid, file, {
                    title: meta.title,
                    lawyerNote: meta.lawyerNote || null,
                    customCategory: classification || null,
                    tags: classification ? [classification] : [],
                });

                if (saveGenerationRef.current !== saveGeneration) return;

                prependVaultDoc(saved.doc);
                onAfterVaultSave?.();

                if (classification) {
                    addVaultCategory(classification);
                    setActiveFilter(classification);
                } else {
                    setActiveFilter('الكل');
                }

                revokePreviewBlob();
                setPendingUpload(null);
                setUploadQueue([]);
                resetFileInputs();

                SmartToast.success(saved.localOnly ? 'تم حفظ الملف محلياً' : 'تم رفع الملف بنجاح');

                void saved.persistTask.catch((err) => {
                    const message = reportVaultPersistFailure(err, file.name);
                    if (message) SmartToast.error(message);
                });

                if (queue.length > 0) {
                    beginNextPendingUpload(queue, kind);
                }
            } catch (err) {
                SmartToast.error(reportVaultPersistFailure(err, file.name));
            } finally {
                isSavingMetaRef.current = false;
                setIsSavingMeta(false);
            }
        },
        [
            addVaultCategory,
            beginNextPendingUpload,
            currentUserId,
            pendingUpload,
            prependVaultDoc,
            resetFileInputs,
            revokePreviewBlob,
            setActiveFilter,
            onAfterVaultSave,
        ],
    );

    return {
        pendingUpload,
        uploadQueueCount: uploadQueue.length,
        isSavingMeta,
        imageInputRef,
        pdfInputRef,
        handleImageUploadSelect,
        handlePdfUploadSelect,
        confirmPendingUpload,
        cancelPendingUpload,
    };
}
