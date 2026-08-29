import { useEffect, useRef, useState, type MutableRefObject } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    listRepositoryDocumentsSync,
    RepositoryDB,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import {
    peekRepositoryDocsCache,
    readRepositoryDocsCache,
    warmRepositoryThumbnailUrls,
} from '@/app/services/forum/repositoryDocsWarmCache';
import { withForumAsyncTimeout } from '../forumAsync';

const REPOSITORY_CACHE_HYDRATE_TIMEOUT_MS = 2_000;
const REPOSITORY_FETCH_TIMEOUT_MS = 6_000;

type UseLegalRepositoryBootstrapParams = {
    applyDocuments: (docs: RepositoryDocument[]) => void;
    documentsRef: MutableRefObject<RepositoryDocument[]>;
    allowRemoteFetch?: boolean;
};

export function useLegalRepositoryBootstrap({
    applyDocuments,
    documentsRef,
    allowRemoteFetch = true,
}: UseLegalRepositoryBootstrapParams) {
    const [syncing, setSyncing] = useState(false);
    const localHydratedRef = useRef(false);

    useEffect(() => {
        let cancelled = false;

        const runBootstrap = async () => {
            let hydratedCount = documentsRef.current.length;

            if (!localHydratedRef.current) {
                const cached = peekRepositoryDocsCache();
                if (cached && cached.length > 0) {
                    applyDocuments(cached);
                    hydratedCount = Math.max(hydratedCount, cached.length);
                }

                const localSync = listRepositoryDocumentsSync();
                if (localSync.length > 0) {
                    applyDocuments(localSync);
                    hydratedCount = Math.max(hydratedCount, localSync.length);
                }

                const warmed = await withForumAsyncTimeout(
                    readRepositoryDocsCache(),
                    REPOSITORY_CACHE_HYDRATE_TIMEOUT_MS,
                    [],
                );
                if (!cancelled && warmed.length > 0) {
                    applyDocuments(warmed);
                    hydratedCount = Math.max(hydratedCount, warmed.length);
                    if (allowRemoteFetch) {
                        void warmRepositoryThumbnailUrls(warmed).catch(() => undefined);
                    }
                }
                if (!cancelled) localHydratedRef.current = true;
            }

            if (cancelled) return;

            if (!allowRemoteFetch) {
                if (!cancelled) setSyncing(false);
                return;
            }

            const fetchRemote = async () => {
                try {
                    const docs = await withForumAsyncTimeout(
                        RepositoryDB.listDocuments(),
                        REPOSITORY_FETCH_TIMEOUT_MS,
                        documentsRef.current,
                    );
                    if (!cancelled) {
                        applyDocuments(docs);
                        void warmRepositoryThumbnailUrls(docs).catch(() => undefined);
                    }
                } catch {
                    if (!cancelled && documentsRef.current.length === 0) {
                        SmartToast.error('فشل تحميل المستندات');
                    }
                } finally {
                    if (!cancelled) setSyncing(false);
                }
            };

            if (hydratedCount === 0) {
                setSyncing(true);
                await fetchRemote();
                return;
            }

            void fetchRemote();
        };

        void runBootstrap();
        return () => {
            cancelled = true;
            setSyncing(false);
        };
    }, [allowRemoteFetch, applyDocuments, documentsRef]);

    return { syncing };
}
