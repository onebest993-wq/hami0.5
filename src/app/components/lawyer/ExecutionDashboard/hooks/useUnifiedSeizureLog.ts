import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ThirdPartySeizure } from '@/app/types/execution';
import {
    isSeizureLogTab,
    type SeizureLogTab,
} from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';
import {
    buildUnifiedSeizureLogEntries,
    computeUnifiedSeizureTabCounts,
    hasUnifiedSeizureLogEntries,
    type UnifiedSeizureLogBuildInput,
} from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogEntries';
import { resolveFirstUnifiedSeizureTab } from '@/app/components/lawyer/ExecutionDashboard/utils/unifiedSeizureLogHelpers';
import { SEIZURE_CLOSE_UNIFIED_LOG_EVENT } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureInlineFocusUtils';
import { prefetchUnifiedSeizureLogHost } from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyRegistry';

export type UseUnifiedSeizureLogInput = UnifiedSeizureLogBuildInput & {
    thirdPartySeizuresUi: ThirdPartySeizure[];
    decisionsReloadEpoch?: number;
    showToast?: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

export function useUnifiedSeizureLog(input: UseUnifiedSeizureLogInput) {
    const {
        thirdPartySeizuresUi,
        showToast,
        viewExecutionData,
        decisionsStorageExecutionId,
        executionId,
        activeDebtorIsDeceased,
        realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        movableSeizureRegistryAssets,
        seizedMovablesForSeizureLog,
        thirdPartySeizureRegistryAssets,
        decisionsReloadEpoch,
    } = input;

    const [showUnifiedSeizureLogModal, setShowUnifiedSeizureLogModal] = useState(false);
    const [unifiedSeizureLogTab, setUnifiedSeizureLogTab] = useState<SeizureLogTab>('property');
    const [thirdPartyFundsDraftById, setThirdPartyFundsDraftById] = useState<Record<string, string>>({});

    const unifiedSeizureLogEntries = useMemo(
        () =>
            buildUnifiedSeizureLogEntries({
                viewExecutionData,
                decisionsStorageExecutionId,
                executionId,
                activeDebtorIsDeceased,
                realEstateSeizureRegistryAssets,
                salarySeizureRegistryAssets,
                movableSeizureRegistryAssets,
                seizedMovablesForSeizureLog,
                thirdPartySeizureRegistryAssets,
                thirdPartySeizuresUi,
            }),
        [
            activeDebtorIsDeceased,
            decisionsReloadEpoch,
            decisionsStorageExecutionId,
            executionId,
            movableSeizureRegistryAssets,
            realEstateSeizureRegistryAssets,
            salarySeizureRegistryAssets,
            seizedMovablesForSeizureLog,
            thirdPartySeizureRegistryAssets,
            thirdPartySeizuresUi,
            viewExecutionData,
        ]
    );

    const unifiedSeizureTabCounts = useMemo(
        () => computeUnifiedSeizureTabCounts(unifiedSeizureLogEntries),
        [unifiedSeizureLogEntries]
    );

    const hasUnifiedSeizureLogContent = useMemo(
        () => hasUnifiedSeizureLogEntries(unifiedSeizureLogEntries),
        [unifiedSeizureLogEntries]
    );

    useEffect(() => {
        setThirdPartyFundsDraftById({});
    }, [showUnifiedSeizureLogModal]);

    useEffect(() => {
        const aliveIds = new Set(
            thirdPartySeizuresUi.map((s) => String(s?.id || '').trim()).filter(Boolean)
        );
        const terminalIds = new Set(
            thirdPartySeizuresUi
                .filter((s) => {
                    const status = String(s?.status || '').trim();
                    const replyStatus = String(s?.replyStatus || '').trim();
                    if (status === 'funds_received') return true;
                    if (status === 'replied' && replyStatus === 'denied') return true;
                    return false;
                })
                .map((s) => String(s?.id || '').trim())
                .filter(Boolean)
        );

        setThirdPartyFundsDraftById((prev) => {
            let changed = false;
            const next: Record<string, string> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (!aliveIds.has(k) || terminalIds.has(k)) {
                    changed = true;
                    continue;
                }
                next[k] = v;
            }
            return changed ? next : prev;
        });
    }, [thirdPartySeizuresUi]);

    const openUnifiedSeizureLog = useCallback(
        (opts?: { tab?: string; emptyMessage?: string }) => {
            prefetchUnifiedSeizureLogHost();
            if (!hasUnifiedSeizureLogContent) {
                showToast?.(
                    opts?.emptyMessage ?? 'لا يوجد سجل حجز في هذه الإضبارة بعد.',
                    'info'
                );
                return false;
            }
            setUnifiedSeizureLogTab(resolveFirstUnifiedSeizureTab(unifiedSeizureTabCounts, opts?.tab));
            setShowUnifiedSeizureLogModal(true);
            return true;
        },
        [hasUnifiedSeizureLogContent, showToast, unifiedSeizureTabCounts]
    );

    const closeUnifiedSeizureLog = useCallback(() => {
        setShowUnifiedSeizureLogModal(false);
    }, []);

    const clearThirdPartyFundsDraft = useCallback((seizureId: string) => {
        const id = String(seizureId || '').trim();
        if (!id) return;
        setThirdPartyFundsDraftById((prevDrafts) => {
            if (!(id in prevDrafts)) return prevDrafts;
            const next = { ...prevDrafts };
            delete next[id];
            return next;
        });
    }, []);

    useEffect(() => {
        const handler = (e: Event) => {
            prefetchUnifiedSeizureLogHost();
            const tab = String((e as CustomEvent<{ tab?: string }>).detail?.tab || '').trim();
            if (isSeizureLogTab(tab)) {
                setUnifiedSeizureLogTab(resolveFirstUnifiedSeizureTab(unifiedSeizureTabCounts, tab));
            } else {
                setUnifiedSeizureLogTab(resolveFirstUnifiedSeizureTab(unifiedSeizureTabCounts));
            }
            setShowUnifiedSeizureLogModal(true);
            if (!hasUnifiedSeizureLogContent) {
                showToast?.('لا يوجد سجل حجز في هذه الإضبارة بعد.', 'info');
            }
        };
        window.addEventListener('hami-open-unified-seizure-log', handler as EventListener);
        return () => window.removeEventListener('hami-open-unified-seizure-log', handler as EventListener);
    }, [hasUnifiedSeizureLogContent, showToast, unifiedSeizureTabCounts]);

    useEffect(() => {
        const allowedIds = Array.from(
            new Set(
                [
                    String(decisionsStorageExecutionId ?? '').trim(),
                    String(executionId ?? '').trim(),
                    String(viewExecutionData?.id ?? '').trim(),
                ].filter(Boolean),
            ),
        );
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            if (evId && !allowedIds.includes(evId)) return;
            setShowUnifiedSeizureLogModal(false);
        };
        window.addEventListener(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, handler as EventListener);
        return () => window.removeEventListener(SEIZURE_CLOSE_UNIFIED_LOG_EVENT, handler as EventListener);
    }, [decisionsStorageExecutionId, executionId, viewExecutionData?.id]);

    return {
        showUnifiedSeizureLogModal,
        setShowUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        unifiedSeizureLogTab,
        setUnifiedSeizureLogTab,
        unifiedSeizureLogEntries,
        unifiedSeizureTabCounts,
        hasUnifiedSeizureLogContent,
        openUnifiedSeizureLog,
        thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft,
    };
}
