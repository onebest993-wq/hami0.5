import React, { useCallback, useLayoutEffect, useState } from 'react';
import type { SmartRepositoryModalProps } from '@/app/components/lawyer/SmartRepositoryModal';
import { RepositoryInstantShell } from '@/app/components/lawyer/SmartRepository/RepositoryInstantShell';
import {
    getCachedSmartRepositoryModal,
    loadRepositoryHubModule,
    type SmartRepositoryModalComponent,
} from '@/app/runtime/repositoryHubLoader';
import {
    REPOSITORY_SHELL_HYDRATED_EVENT,
    hydrateRepositoryBootShellForInstantOpen,
} from '@/app/runtime/repositoryBootHydrator';
import { prefetchVaultBlobStore } from '@/app/services/vaultBlobStore';
import { prefetchRepositoryDialogs } from '@/app/components/lawyer/SmartRepository/repositoryDialog';

const LOAD_RETRY_MS = 700;
const MAX_LOAD_ATTEMPTS = 3;

function RepositoryLoadError({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
    return (
        <div
            data-testid="repository-load-error"
            className="fixed inset-0 z-[120] bg-[#0B1021]/95 flex flex-col items-center justify-center gap-4 px-6 font-['Tajawal','Cairo',sans-serif]"
            role="alert"
        >
            <p className="text-[#E6C673]/85 text-sm font-bold text-center">تعذّر تحميل المستودع الذكي</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                    type="button"
                    data-testid="repository-load-retry"
                    onClick={onRetry}
                    className="min-h-[44px] rounded-xl border border-[#E6C673]/35 bg-white/5 px-4 py-2 text-sm font-bold text-[#E6C673] touch-manipulation"
                >
                    إعادة المحاولة
                </button>
                <button
                    type="button"
                    onClick={onClose}
                    className="min-h-[44px] rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white touch-manipulation"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
}

/**
 * يحمّل SmartRepositoryModal مرة واحدة ويبقيه mounted مع keepAlive — الفتح التالي فوري.
 */
export function SmartRepositoryHost(props: SmartRepositoryModalProps): React.ReactElement | null {
    const { isOpen, onClose } = props;
    const [Component, setComponent] = useState<SmartRepositoryModalComponent | null>(() =>
        getCachedSmartRepositoryModal(),
    );
    const [loadFailed, setLoadFailed] = useState(false);
    const [loadGeneration, setLoadGeneration] = useState(0);

    const retryLoad = useCallback(() => {
        setLoadFailed(false);
        setLoadGeneration((g) => g + 1);
    }, []);

    useLayoutEffect(() => {
        const cached = getCachedSmartRepositoryModal();
        if (cached) {
            setComponent(() => cached);
            setLoadFailed(false);
        }

        let cancelled = false;
        let attempts = 0;

        const adoptModule = () => {
            void loadRepositoryHubModule()
                .then((mod) => {
                    if (cancelled) return;
                    if (mod?.SmartRepositoryModal) {
                        setComponent(() => mod.SmartRepositoryModal);
                        setLoadFailed(false);
                        return;
                    }
                    throw new Error('SmartRepositoryModal missing');
                })
                .catch(() => {
                    if (cancelled) return;
                    attempts += 1;
                    if (attempts < MAX_LOAD_ATTEMPTS) {
                        window.setTimeout(adoptModule, LOAD_RETRY_MS);
                        return;
                    }
                    setLoadFailed(true);
                });
        };

        adoptModule();

        const onHydrated = () => {
            const resolved = getCachedSmartRepositoryModal();
            if (resolved) {
                setComponent(() => resolved);
                setLoadFailed(false);
            }
        };
        window.addEventListener(REPOSITORY_SHELL_HYDRATED_EVENT, onHydrated);

        return () => {
            cancelled = true;
            window.removeEventListener(REPOSITORY_SHELL_HYDRATED_EVENT, onHydrated);
        };
    }, [loadGeneration]);

    useLayoutEffect(() => {
        const userId = props.currentUserId;
        if (isOpen) {
            void hydrateRepositoryBootShellForInstantOpen(userId, true);
            void import('@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor');
            void import('@/app/components/lawyer/SmartVaultModal/SmartVaultScannerPanel');
            prefetchVaultBlobStore();
            prefetchRepositoryDialogs();
        }
    }, [isOpen, props.currentUserId]);

    if (Component) {
        return <Component {...props} />;
    }

    if (!isOpen) {
        return null;
    }

    if (loadFailed) return <RepositoryLoadError onRetry={retryLoad} onClose={onClose} />;
    return <RepositoryInstantShell onClose={onClose} />;
}
