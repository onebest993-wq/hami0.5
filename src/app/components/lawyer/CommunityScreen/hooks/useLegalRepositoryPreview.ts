import { useCallback, useState, type MutableRefObject } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import {
    downloadRepositoryFile,
    resolveRepositoryStorageUrl,
} from '../repositoryStorageService';
import { withForumAsyncTimeout } from '../forumAsync';

type UseLegalRepositoryPreviewParams = {
    actionInflightRef: MutableRefObject<Set<string>>;
};

export function useLegalRepositoryPreview({ actionInflightRef }: UseLegalRepositoryPreviewParams) {
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [openingId, setOpeningId] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<RepositoryDocument | null>(null);
    const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewMode, setPreviewMode] = useState<'peek' | 'open'>('peek');

    const handleDownload = useCallback(async (doc: RepositoryDocument) => {
        if (actionInflightRef.current.has(`dl:${doc.id}`)) return;
        actionInflightRef.current.add(`dl:${doc.id}`);
        setDownloadingId(doc.id);
        try {
            if (!doc.storagePath) {
                SmartToast.warning('الملف غير متاح للتحميل');
                return;
            }
            const url = await withForumAsyncTimeout(
                resolveRepositoryStorageUrl(doc.storagePath),
                8_000,
                null,
            );
            if (!url) {
                SmartToast.warning('رابط التحميل غير متاح — جرّب بعد لحظات');
                return;
            }
            await downloadRepositoryFile(url, doc.fileName || doc.title);
            SmartToast.success(`تم تحميل "${doc.title}"`);
        } catch {
            SmartToast.error('فشل تحميل المستند');
        } finally {
            actionInflightRef.current.delete(`dl:${doc.id}`);
            setDownloadingId(null);
        }
    }, [actionInflightRef]);

    const openPreviewWithMode = useCallback(
        async (doc: RepositoryDocument, mode: 'peek' | 'open') => {
            const inflightKey = `${mode}:${doc.id}`;
            if (actionInflightRef.current.has(inflightKey)) return;

            actionInflightRef.current.add(inflightKey);
            if (mode === 'open') setOpeningId(doc.id);

            setPreviewDoc(doc);
            setPreviewMode(mode);

            if (!doc.storagePath) {
                setPreviewSignedUrl(null);
                setPreviewLoading(false);
                actionInflightRef.current.delete(inflightKey);
                if (mode === 'open') setOpeningId(null);
                SmartToast.warning(mode === 'open' ? 'الملف غير متاح للفتح' : 'الملف غير متاح للاطلاع');
                return;
            }

            setPreviewLoading(true);
            try {
                const url = await withForumAsyncTimeout(
                    resolveRepositoryStorageUrl(doc.storagePath),
                    mode === 'open' ? 8_000 : 5_000,
                    null,
                );
                setPreviewSignedUrl(url);
                if (!url) {
                    SmartToast.warning(mode === 'open' ? 'تعذر فتح الملف حالياً' : 'تعذر تحميل المعاينة');
                }
            } catch {
                setPreviewSignedUrl(null);
                SmartToast.error(mode === 'open' ? 'فشل فتح الملف' : 'فشل تحميل المعاينة');
            } finally {
                setPreviewLoading(false);
                actionInflightRef.current.delete(inflightKey);
                if (mode === 'open') setOpeningId(null);
            }
        },
        [actionInflightRef],
    );

    const handleOpenDocument = useCallback(
        async (doc: RepositoryDocument) => {
            await openPreviewWithMode(doc, 'open');
        },
        [openPreviewWithMode],
    );

    const handlePreview = useCallback(
        async (doc: RepositoryDocument) => {
            await openPreviewWithMode(doc, 'peek');
        },
        [openPreviewWithMode],
    );

    const closePreview = useCallback(() => {
        setPreviewDoc(null);
        setPreviewSignedUrl(null);
        setPreviewMode('peek');
    }, []);

    return {
        downloadingId,
        openingId,
        previewDoc,
        previewSignedUrl,
        previewLoading,
        previewMode,
        handleDownload,
        handleOpenDocument,
        handlePreview,
        closePreview,
    };
}
