import { useCallback, useEffect, useMemo, useState, type RefObject } from 'react';
import {
    resolveActiveFollowupChipTabId,
    resolveFollowupActivePanelKey,
    useFollowupModalTabKeepAlive,
} from '../followupTabKeepAlive';
import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';

export function useExecutionFollowupModalTabNavigation(args: {
    // Context snapshot values are loosely typed (`unknown`); keep permissive here.
    unifiedModalTab: string | unknown;
    setUnifiedModalTab: ((tab: string) => void) | unknown;
    persistFollowupModalViewport: (() => void) | unknown;
    queueMicrotask: ((cb: () => void) => void) | unknown;
    showPersonalCoerciveFollowupTab: boolean | unknown;
    hideFollowupCoerciveTab: unknown;
    followupModalTabs: Array<{ id: string }> | unknown;
    followupModalSectionTabsRef: RefObject<HTMLElement | null> | unknown;
    openSeizureRequestsTab: (() => void) | unknown;
}) {
    const {
        unifiedModalTab,
        setUnifiedModalTab,
        persistFollowupModalViewport,
        queueMicrotask,
        showPersonalCoerciveFollowupTab,
        hideFollowupCoerciveTab,
        followupModalTabs: followupModalTabsRaw,
        followupModalSectionTabsRef,
        openSeizureRequestsTab,
    } = args;

    const followupModalTabs = Array.isArray(followupModalTabsRaw)
        ? (followupModalTabsRaw as Array<{ id: string }>)
        : [];
    const queueMicro =
        typeof queueMicrotask === 'function'
            ? (queueMicrotask as (cb: () => void) => void)
            : (cb: () => void) => {
                  Promise.resolve().then(cb);
              };
    const persistViewport =
        typeof persistFollowupModalViewport === 'function'
            ? (persistFollowupModalViewport as () => void)
            : undefined;
    const setTab =
        typeof setUnifiedModalTab === 'function'
            ? (setUnifiedModalTab as (tab: string) => void)
            : undefined;
    const openSeizure =
        typeof openSeizureRequestsTab === 'function'
            ? (openSeizureRequestsTab as () => void)
            : () => {};
    const sectionTabsRef = followupModalSectionTabsRef as RefObject<HTMLElement | null>;
    const showPersonal = Boolean(showPersonalCoerciveFollowupTab);
    const modalTab = String(unifiedModalTab ?? '');

    const followupSectionTabOrder = useMemo(
        () => followupModalTabs.map((tab) => String(tab.id)),
        [followupModalTabs],
    );
    const [localUnifiedModalTab, setLocalUnifiedModalTab] = useState(modalTab);

    useEffect(() => {
        setLocalUnifiedModalTab(modalTab);
    }, [modalTab]);

    const commitFollowupTabChange = useCallback(
        (nextTab: string) => {
            setLocalUnifiedModalTab(nextTab);
            setTab?.(nextTab);
            queueMicro(() => persistViewport?.());
        },
        [persistViewport, queueMicro, setTab],
    );

    const activePanelKey = useMemo(
        () =>
            resolveFollowupActivePanelKey({
                unifiedModalTab: localUnifiedModalTab,
                showPersonalCoerciveFollowupTab: showPersonal,
                hideFollowupCoerciveTab: Boolean(hideFollowupCoerciveTab),
                effectiveFollowupSectionTabOrder: followupSectionTabOrder,
            }),
        [localUnifiedModalTab, showPersonal, hideFollowupCoerciveTab, followupSectionTabOrder],
    );
    const activeChipTabId = useMemo(
        () =>
            resolveActiveFollowupChipTabId({
                unifiedModalTab: localUnifiedModalTab,
                showPersonalCoerciveFollowupTab: showPersonal,
                hideFollowupCoerciveTab: Boolean(hideFollowupCoerciveTab),
                effectiveFollowupSectionTabOrder: followupSectionTabOrder,
            }),
        [localUnifiedModalTab, showPersonal, hideFollowupCoerciveTab, followupSectionTabOrder],
    );
    const panelsToRender = useFollowupModalTabKeepAlive(activePanelKey);

    const scrollFollowupChipIntoView = useCallback(
        (tabId: string) => {
            queueMicro(() => {
                const host = sectionTabsRef?.current;
                if (!host) return;
                const chip = host.querySelector(`[data-followup-tab="${String(tabId)}"]`) as HTMLElement | null;
                chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
            });
        },
        [sectionTabsRef, queueMicro],
    );

    const switchFollowupTab = useCallback(
        (nextTab: string) => {
            prefetchExecutionFollowupTab(nextTab);
            if (nextTab === 'seizure_requests') {
                setLocalUnifiedModalTab('seizure_requests');
                openSeizure();
                queueMicro(() => persistViewport?.());
                scrollFollowupChipIntoView('seizure_requests');
                return;
            }
            commitFollowupTabChange(nextTab);
            scrollFollowupChipIntoView(nextTab);
        },
        [
            commitFollowupTabChange,
            openSeizure,
            persistViewport,
            queueMicro,
            scrollFollowupChipIntoView,
        ],
    );

    const navigateFollowupTabByDelta = useCallback(
        (delta: number) => {
            const order = followupModalTabs.map((tab) => tab.id);
            if (!order.length) return;
            const currentTab = order.includes(activeChipTabId) ? activeChipTabId : order[0];
            const currentIndex = order.indexOf(currentTab);
            const nextTab = order[(currentIndex + delta + order.length) % order.length];
            switchFollowupTab(nextTab);
        },
        [activeChipTabId, followupModalTabs, switchFollowupTab],
    );

    useEffect(() => {
        prefetchExecutionFollowupTab(activePanelKey);
    }, [activePanelKey]);

    return {
        localUnifiedModalTab,
        commitFollowupTabChange,
        activePanelKey,
        activeChipTabId,
        panelsToRender,
        scrollFollowupChipIntoView,
        switchFollowupTab,
        navigateFollowupTabByDelta,
    };
}
