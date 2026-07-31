import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import { loadPersistedViewMode, persistViewMode } from '@/app/services/settings/builtInBehavior';
import {
    addCustomCategory,
    countDocsInCategory,
    removeCustomCategory,
    mergeCustomCategoriesFromDocs,
} from '@/app/services/vaultCustomCategories';
import { filterVaultDocs } from '@/app/services/vault/vaultDocUtils';
import {
    peekVaultDocsWarmCache,
    setVaultDocsWarmCache,
    mergeVaultDocsWarmCache,
    removeVaultDocFromWarmCache,
    refreshVaultDocsFromStore,
    SMART_VAULT_DOCS_UPDATED_EVENT,
} from '@/app/services/vault/vaultDocsWarmCache';
import { readVaultLocalIndexSync, filterDeletedVaultDocs } from '@/app/services/vault/vaultLocalIndex';
import { mergeSmartVaultDocs } from '@/app/services/vault/vaultDocUtils';
import { invalidateRepositoryFeedCache } from '@/app/services/repository/repositoryFeedWarmCache';
import type { ViewMode } from './types';
import { getInitialCustomCategories, getBootstrapVaultDocs, resolveBootstrapUid } from './bootstrap';

function seedVaultDocsForUser(uid: string, current: SmartVaultDoc[]): SmartVaultDoc[] {
    const local = filterDeletedVaultDocs(readVaultLocalIndexSync().filter((d) => d.authorId === uid));
    const warm = filterDeletedVaultDocs(peekVaultDocsWarmCache(uid) ?? []);
    return mergeSmartVaultDocs(mergeSmartVaultDocs(local, warm), current);
}

export function useSmartVaultData(currentUserId: string, propUserId?: string, embedded?: boolean) {
    const [docs, setDocs] = useState<SmartVaultDoc[]>(() => getBootstrapVaultDocs(propUserId));
    const [isLoading, setIsLoading] = useState(() => {
        const uid = resolveBootstrapUid(propUserId);
        if (!uid) return false;
        return getBootstrapVaultDocs(propUserId).length === 0;
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
    const loadGenerationRef = useRef(0);

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

        const generation = ++loadGenerationRef.current;

        const seeded = seedVaultDocsForUser(uid, docsRef.current);
        if (seeded.length > 0) {
            setDocs(seeded);
            setVaultDocsWarmCache(uid, seeded);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, seeded));
            setIsLoading(false);
        } else {
            setIsLoading(true);
        }

        try {
            const fetched = await refreshVaultDocsFromStore(uid);
            if (generation !== loadGenerationRef.current) return;
            const merged = mergeSmartVaultDocs(fetched, docsRef.current);
            setDocs(merged);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, merged));
            setVaultDocsWarmCache(uid, merged);
            invalidateRepositoryFeedCache();
        } catch {
            if (generation !== loadGenerationRef.current) return;
            if (seeded.length === 0) SmartToast.error('فشل تحميل الملفات');
        } finally {
            if (generation === loadGenerationRef.current) {
                setIsLoading(false);
            }
        }
    }, [currentUserId]);

    const prependVaultDoc = useCallback(
        (doc: SmartVaultDoc) => {
            const uid = currentUserId?.trim();
            const author = doc.authorId?.trim();
            if (!uid) {
                SmartToast.error('تعذّر إظهار الملف في القائمة — معرف المستخدم غير متوفر');
                return;
            }
            if (author && author !== uid) {
                SmartToast.error('تعذّر إظهار الملف — تعارض في حساب المستخدم');
                return;
            }
            const base = docsRef.current;
            const next = mergeSmartVaultDocs(base, [doc]).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
            );
            mergeVaultDocsWarmCache(uid, [doc]);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, next));
            setDocs(next);
            invalidateRepositoryFeedCache();
        },
        [currentUserId],
    );

    const removeVaultDoc = useCallback(
        (docId: string) => {
            const uid = currentUserId?.trim();
            const id = docId.trim();
            if (!uid || !id) return;
            const next = docsRef.current.filter((doc) => doc.id !== id);
            removeVaultDocFromWarmCache(uid, id);
            setVaultDocsWarmCache(uid, next);
            setCustomCategories(mergeCustomCategoriesFromDocs(uid, next));
            setDocs(next);
            invalidateRepositoryFeedCache();
        },
        [currentUserId],
    );

    useEffect(() => {
        const uid = currentUserId?.trim();
        if (!uid) return;
        if (embedded) {
            void loadDocs();
            return;
        }
        const run = () => void loadDocs();
        if (typeof requestIdleCallback === 'function') {
            const id = requestIdleCallback(run, { timeout: 1_500 });
            return () => cancelIdleCallback(id);
        }
        const timer = window.setTimeout(run, 80);
        return () => window.clearTimeout(timer);
    }, [embedded, loadDocs, currentUserId]);

    useEffect(() => {
        const uid = currentUserId?.trim();
        if (!uid || typeof window === 'undefined') return;

        const onDocsUpdated = (event: Event) => {
            const detail = (event as CustomEvent<{ userId?: string; docs?: SmartVaultDoc[] }>).detail;
            if (!detail?.userId || detail.userId !== uid) return;
            if (detail.docs?.length) {
                const next = mergeSmartVaultDocs(docsRef.current, detail.docs).sort(
                    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
                );
                setDocs(next);
                setVaultDocsWarmCache(uid, next);
                setCustomCategories(mergeCustomCategoriesFromDocs(uid, next));
            }
            void loadDocs();
        };

        window.addEventListener(SMART_VAULT_DOCS_UPDATED_EVENT, onDocsUpdated as EventListener);
        return () =>
            window.removeEventListener(
                SMART_VAULT_DOCS_UPDATED_EVENT,
                onDocsUpdated as EventListener,
            );
    }, [currentUserId, loadDocs]);

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
        prependVaultDoc,
        removeVaultDoc,
    };
}
