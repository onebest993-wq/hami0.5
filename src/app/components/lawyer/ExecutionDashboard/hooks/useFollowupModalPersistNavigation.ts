import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';
import {
    readFollowupModalPersist,
    writeFollowupModalPersist,
    resolveFollowupTabOnOpen,
    type FollowupModalTabId,
} from '../utils/followupModalPersistUtils';
import type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

export type { FollowupUnifiedModalTab } from '../followupModalTabTypes';

export type UseFollowupModalPersistNavigationParams = {
    showUnifiedExecutionModal: boolean;
    unifiedModalTab: FollowupUnifiedModalTab;
    setUnifiedModalTab: (tab: FollowupUnifiedModalTab) => void;
    followupSectionTabOrder: readonly string[];
    dossierFileKey: string;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    followupModalBodyScrollRef: RefObject<HTMLDivElement | null>;
    followupModalSectionTabsRef: RefObject<HTMLDivElement | null>;
    followupModalOpenGenerationRef: MutableRefObject<number>;
    seizureMatrixRef: MutableRefObject<{ hideSeizureTab: boolean }>;
    openSeizureRequestsTabRef: MutableRefObject<() => void>;
};

/** persist + scroll restore + keyboard nav لمحضر المتابعة */
export function useFollowupModalPersistNavigation({
    showUnifiedExecutionModal,
    unifiedModalTab,
    setUnifiedModalTab,
    followupSectionTabOrder,
    dossierFileKey,
    setShowUnifiedExecutionModal,
    followupModalBodyScrollRef,
    followupModalSectionTabsRef,
    followupModalOpenGenerationRef,
    seizureMatrixRef,
    openSeizureRequestsTabRef,
}: UseFollowupModalPersistNavigationParams) {
    const followupModalScrollRestoredForGenRef = useRef(0);

    const followupModalPersistStorageKey = `hami-followup-modal:${dossierFileKey}`;

    const readFollowupModalPersistForDossier = useCallback(
        () => readFollowupModalPersist(followupModalPersistStorageKey),
        [followupModalPersistStorageKey],
    );

    const writeFollowupModalPersistForDossier = useCallback(
        (patch: { tab?: string; scroll?: number }) =>
            writeFollowupModalPersist(followupModalPersistStorageKey, patch),
        [followupModalPersistStorageKey],
    );

    const persistFollowupModalViewport = useCallback(() => {
        const body = followupModalBodyScrollRef.current;
        writeFollowupModalPersistForDossier({
            tab: unifiedModalTab,
            scroll: body?.scrollTop ?? readFollowupModalPersistForDossier().scroll ?? 0,
        });
    }, [followupModalBodyScrollRef, readFollowupModalPersistForDossier, unifiedModalTab, writeFollowupModalPersistForDossier]);

    const goFollowupSectionTabByDelta = useCallback(
        (delta: number) => {
            const order = (followupSectionTabOrder as readonly string[]).filter(
                (tabId) => tabId !== 'seizure_requests' || !seizureMatrixRef.current.hideSeizureTab,
            );
            if (!order.length) return;
            const cur = order.includes(unifiedModalTab) ? unifiedModalTab : order[0];
            const idx = order.indexOf(cur);
            const next = order[(idx + delta + order.length) % order.length] as FollowupUnifiedModalTab;
            setUnifiedModalTab(next);
            void import('../executionFollowupTabPrefetch')
                .then((m) => m.prefetchExecutionFollowupTab(next))
                .catch(() => undefined);
            queueMicrotask(() => {
                const host = followupModalSectionTabsRef.current;
                if (!host) return;
                const el = host.querySelector(`[data-followup-tab="${String(next)}"]`) as HTMLElement | null;
                el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },
        [followupSectionTabOrder, followupModalSectionTabsRef, seizureMatrixRef, setUnifiedModalTab, unifiedModalTab],
    );

    const openFollowupModalPersisted = useCallback(
        (opts?: { tab?: FollowupModalTabId }) => {
            void import('../executionFollowupModalLazy')
                .then((m) => m.prefetchExecutionFollowupModalPortal())
                .catch(() => undefined);
            followupModalOpenGenerationRef.current += 1;
            setShowUnifiedExecutionModal(true);
            const order = (followupSectionTabOrder as readonly string[]).filter(
                (tabId) => tabId !== 'seizure_requests' || !seizureMatrixRef.current.hideSeizureTab,
            );
            const resolved = resolveFollowupTabOnOpen({
                explicitTab: opts?.tab,
                savedTab: readFollowupModalPersistForDossier().tab,
                allowedTabOrder: order,
            });
            const tabToPrefetch = resolved.routeSeizureRequests
                ? 'seizure_requests'
                : resolved.tab ?? 'seizure_requests';
            void import('../executionFollowupTabPrefetch')
                .then((m) => m.prefetchExecutionFollowupTab(tabToPrefetch))
                .catch(() => undefined);
            if (resolved.routeSeizureRequests) {
                openSeizureRequestsTabRef.current();
                return;
            }
            if (resolved.tab) {
                setUnifiedModalTab(resolved.tab as FollowupUnifiedModalTab);
            }
        },
        [
            followupModalOpenGenerationRef,
            followupSectionTabOrder,
            openSeizureRequestsTabRef,
            readFollowupModalPersistForDossier,
            seizureMatrixRef,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
        ],
    );

    const closeFollowupModalPersisted = useCallback(() => {
        persistFollowupModalViewport();
        setShowUnifiedExecutionModal(false);
    }, [persistFollowupModalViewport, setShowUnifiedExecutionModal]);

    useLayoutEffect(() => {
        if (!showUnifiedExecutionModal) {
            followupModalScrollRestoredForGenRef.current = 0;
            return;
        }
        const saved = readFollowupModalPersistForDossier();
        const openGen = followupModalOpenGenerationRef.current;
        const restoreBodyScroll = followupModalScrollRestoredForGenRef.current !== openGen;
        queueMicrotask(() => {
            const host = followupModalSectionTabsRef.current;
            const chip = host?.querySelector(
                `[data-followup-tab="${String(unifiedModalTab)}"]`,
            ) as HTMLElement | null;
            chip?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            if (!restoreBodyScroll) return;
            const body = followupModalBodyScrollRef.current;
            if (body && typeof saved.scroll === 'number') {
                body.scrollTop = saved.scroll;
            }
            followupModalScrollRestoredForGenRef.current = openGen;
        });
    }, [
        followupModalBodyScrollRef,
        followupModalOpenGenerationRef,
        followupModalSectionTabsRef,
        readFollowupModalPersistForDossier,
        showUnifiedExecutionModal,
        unifiedModalTab,
    ]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        writeFollowupModalPersistForDossier({ tab: unifiedModalTab });
    }, [showUnifiedExecutionModal, unifiedModalTab, writeFollowupModalPersistForDossier]);

    useEffect(() => {
        if (!showUnifiedExecutionModal) return;
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            const tag = t?.tagName ? t.tagName.toLowerCase() : '';
            if (tag === 'input' || tag === 'textarea' || tag === 'select' || (t as HTMLElement)?.isContentEditable) {
                return;
            }
            if (!e.altKey) return;
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goFollowupSectionTabByDelta(-1);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                goFollowupSectionTabByDelta(1);
            }
        };
        window.addEventListener('keydown', onKey, true);
        return () => window.removeEventListener('keydown', onKey, true);
    }, [goFollowupSectionTabByDelta, showUnifiedExecutionModal]);

    return {
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    };
}
