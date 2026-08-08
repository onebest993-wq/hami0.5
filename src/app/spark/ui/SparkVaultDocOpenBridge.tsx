import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from '@/app/components/ui/lucideIcons';
import { useAuth } from '@/app/context/AuthContext';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { SPARK_OPEN_VAULT_DOC_EVENT } from '@/app/spark/focus/sparkVaultDocFocus';
import type { VaultFileViewerState } from '@/app/components/lawyer/hooks/smartVault/types';
import { resolveVaultDocForViewing } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import { SmartToast } from '@/app/components/ui/SmartToast';

const LazyVaultDocViewer = lazy(() =>
    import('@/app/components/lawyer/SmartVaultModal/VaultDocViewer').then((m) => ({
        default: m.VaultDocViewer,
    })),
);

function ViewerFallback() {
    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70" aria-busy="true">
            <Loader2 size={28} className="animate-spin text-[#E6C673]" />
        </div>
    );
}

type SparkVaultDocOpenBridgeProps = {
    enabled?: boolean;
};

/** يفتح مرفق الخزنة عند متابعة تنبيه سبارك — بدون تغيير شكل الإضبارة */
export function SparkVaultDocOpenBridge({ enabled = true }: SparkVaultDocOpenBridgeProps) {
    const { user } = useAuth();
    const userId = String(user?.id ?? '').trim();
    const vaultDocs = useVaultDocsForClusterScan(userId || undefined, enabled && Boolean(userId));
    const [fileViewer, setFileViewer] = useState<VaultFileViewerState>(null);
    const fileViewerUrlRef = useRef<string | null>(null);
    const fileViewerRevokeRef = useRef(false);

    useEffect(
        () => () => {
            if (fileViewerRevokeRef.current) revokeBlobUrlIfNeeded(fileViewerUrlRef.current);
        },
        [],
    );

    const closeFileViewer = useCallback(() => {
        setFileViewer((prev) => {
            if (prev?.revokeOnClose) revokeBlobUrlIfNeeded(prev.url);
            return null;
        });
    }, []);

    const openDocById = useCallback(
        async (docId: string) => {
            const id = String(docId ?? '').trim();
            if (!id) return;

            const doc = vaultDocs.find((item) => item.id === id);
            if (!doc) {
                SmartToast.error('تعذر العثور على المرفق — حدّث الخزنة وحاول مجدداً');
                return;
            }

            prefetchVaultBlobStore();
            try {
                const payload = await resolveVaultDocForViewing(doc);
                if (!payload) {
                    SmartToast.error(
                        'تعذر فتح الملف — قد يكون غير محفوظ على الجهاز. أعد رفعه أو حدّث الصفحة',
                    );
                    return;
                }

                if (payload.kind === 'file') {
                    const opened = window.open(payload.url, '_blank', 'noopener,noreferrer');
                    if (!opened) {
                        SmartToast.error('تعذّر فتح الملف — اسمح بالنوافذ المنبثقة أو استخدم زر التحميل');
                    }
                    return;
                }

                fileViewerUrlRef.current = payload.url;
                fileViewerRevokeRef.current = payload.revokeOnClose ?? false;
                setFileViewer({
                    doc: payload.doc,
                    url: payload.url,
                    blob: payload.blob,
                    kind: payload.kind,
                    revokeOnClose: payload.revokeOnClose,
                });
            } catch {
                SmartToast.error('تعذر فتح الملف');
            }
        },
        [vaultDocs],
    );

    useEffect(() => {
        if (!enabled) return;

        const onOpenVaultDoc = (event: Event) => {
            const detail = (event as CustomEvent<{ docId?: string }>).detail;
            void openDocById(String(detail?.docId ?? ''));
        };

        window.addEventListener(SPARK_OPEN_VAULT_DOC_EVENT, onOpenVaultDoc);
        return () => window.removeEventListener(SPARK_OPEN_VAULT_DOC_EVENT, onOpenVaultDoc);
    }, [enabled, openDocById]);

    if (!fileViewer) return null;

    return (
        <Suspense fallback={<ViewerFallback />}>
            <LazyVaultDocViewer
                doc={fileViewer.doc}
                fileUrl={fileViewer.url}
                fileBlob={fileViewer.blob}
                kind={fileViewer.kind}
                onClose={closeFileViewer}
                overlayScope="viewport"
            />
        </Suspense>
    );
}
