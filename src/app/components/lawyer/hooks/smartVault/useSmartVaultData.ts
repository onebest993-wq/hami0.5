import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartVaultDB, type SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import {
    addCustomCategory,
    countDocsInCategory,
    removeCustomCategory,
    mergeCustomCategoriesFromDocs,
} from '@/app/services/vaultCustomCategories';
import { filterVaultDocs } from '@/app/services/vault/vaultDocUtils';
import {
    fetchVaultDocsDeduped,
    peekVaultDocsWarmCache,
    setVaultDocsWarmCache,
} from '@/app/services/vault/vaultDocsWarmCache';
import type { ViewMode } from './types';
import { getInitialCustomCategories, peekBootstrapVaultCache, resolveBootstrapUid } from './bootstrap';

export function useSmartVaultData(currentUserId: string, propUserId?: string, embedded?: boolean) {
    const [docs, setDocs] = useState<SmartVaultDoc[]>(() => peekBootstrapVaultCache(propUserId) ?? []);
    const [isLoading, setIsLoading] = useState(() => {
        const uid = resolveBootstrapUid(propUserId);
        if (!uid) return false;
        const warmed = peekVaultDocsWarmCache(uid);
        if (warmed && warmed.length > 0) return false;
        return !(peekBootstrapVaultCache(propUserId)?.length);
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [activeFilter, setActiveFilter] = useState<string>('الكل');
    const [customCategories, setCustomCategories] = useState<string[]>(() =>
        getInitialCustomCategories(propUserId),
    );
    const [viewMode, setViewModeState] = useState<ViewMode>(() => loadPersistedViewMode());
    const docsRef = useRef(docs);
    docsRef.current = docs;

    const setViewMode = useCallback(
        (mode: ViewMode) => {
            setViewModeState(mode);
            persistViewMode(mode);
            if (!embedded && typeof document !== 'undefined') {
                document.documentElement.dataset.hamiViewMode = mode;
            }
        },
        [embedded],
    );

    const filteredDocs = useMemo(
        () => filterVaultDocs(docs, activeFilter, searchQuery),
        [docs, activeFilter, searchQuery],
    );

    const loadDocs = useCallback(async () => {
        const uid = currentUserId?.trim();
        if (!uid) {
            setDocs([]);
            setCustomCategories([]);
            setIsLoading(false);
            return;
        }

        const cached = peekVaultDocsWarmCache(uid);
        if (cached) {
            setDocs(cached);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, cached));
            setIsLoading(false);
        }

        const VAULT_FETCH_TIMEOUT_MS = 12_000;
        let timedOut = false;
        const timeoutId = window.setTimeout(() => {
            timedOut = true;
            setIsLoading(false);
        }, VAULT_FETCH_TIMEOUT_MS);

        try {
            const all = await fetchVaultDocsDeduped(uid);
            if (timedOut) return;
            setDocs(all);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, all));
            setVaultDocsWarmCache(uid, all);
        } catch {
            if (!cached) SmartToast.error('فشل تحميل الملفات');
        } finally {
            window.clearTimeout(timeoutId);
            setIsLoading(false);
        }
    }, [currentUserId]);

    useEffect(() => {
        void loadDocs();
    }, [loadDocs]);

    const addVaultCategory = useCallback(
        (name: string) => {
            if (!currentUserId) return;
            setCustomCategories(addCustomCategory(currentUserId, name));
        },
        [currentUserId],
    );

    const removeVaultCategory = useCallback(
        async (name: string) => {
            const trimmed = name.trim();
            if (!currentUserId || !trimmed) return;

            const count = countDocsInCategory(docsRef.current, trimmed);
            const ok = await SmartDialog.confirm(
                count > 0
                    ? `هل تريد حذف تصنيف «${trimmed}»؟\nسيتم إزالة التصنيف من ${count} ملف.`
                    : `هل تريد حذف تصنيف «${trimmed}»؟`,
            );
            if (!ok) return;

            try {
                const affected = docsRef.current.filter(
                    (d) => (d.customCategory?.trim() || '') === trimmed,
                );
                for (const doc of affected) {
                    await SmartVaultDB.updateDoc(
                        {
                            ...doc,
                            customCategory: null,
                            tags: doc.tags.filter((t) => t !== trimmed),
                            updatedAt: new Date().toISOString(),
                        },
                        currentUserId,
                    );
                }
                setCustomCategories(removeCustomCategory(currentUserId, trimmed));
                setActiveFilter((f) => (f === trimmed ? 'الكل' : f));
                SmartToast.success('تم حذف التصنيف');
                await loadDocs();
            } catch {
                SmartToast.error('فشل حذف التصنيف');
            }
        },
        [currentUserId, loadDocs],
    );

    return {
        docs,
        docsRef,
        isLoading,
        searchQuery,
        isSearching,
        setIsSearching,
        activeFilter,
        customCategories,
        viewMode,
        filteredDocs,
        setSearchQuery,
        setActiveFilter,
        setViewMode,
        addVaultCategory,
        removeVaultCategory,
        loadDocs,
    };
}
