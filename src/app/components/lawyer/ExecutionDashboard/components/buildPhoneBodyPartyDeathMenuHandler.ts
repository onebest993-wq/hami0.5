import type { MutableRefObject } from 'react';
import { invokeMaybeStubFunctionOrWait } from '../hooks/executionHandlerClusterStubs';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';

type PartyDeathMenuKey = 'handleDebtorDeathMenuAction' | 'handleCreditorDeathMenuAction';

function readPartyDeathHandler(
    source: Record<string, unknown>,
    key: PartyDeathMenuKey,
): ((...args: unknown[]) => unknown) | null {
    const direct = source[key];
    if (typeof direct === 'function') {
        return direct as (...args: unknown[]) => unknown;
    }
    const bag = source.partyDeathHandlers;
    if (bag && typeof bag === 'object' && !Array.isArray(bag)) {
        const nested = (bag as Record<string, unknown>)[key];
        if (typeof nested === 'function') {
            return nested as (...args: unknown[]) => unknown;
        }
        const prefetch = (bag as Record<string, unknown>).prefetchPartyDeathHandlers;
        if (typeof prefetch === 'function') prefetch();
    }
    return null;
}

export function buildPhoneBodyPartyDeathMenuHandler(
    scopeRef: MutableRefObject<Record<string, unknown>> | undefined,
    fallbackSource: Record<string, unknown>,
    key: PartyDeathMenuKey,
): () => void {
    return () => {
        try {
            const live = (scopeRef?.current ?? fallbackSource) as Record<string, unknown>;
            const handler = readPartyDeathHandler(live, key);
            if (handler) {
                handler();
                return;
            }
            void prefetchExecutionHandlerClusterPartyDeathBridge();
            invokeMaybeStubFunctionOrWait(`partyDeathHandlers.${key}`, [], {
                readLive: () =>
                    readPartyDeathHandler(
                        (scopeRef?.current ?? fallbackSource) as Record<string, unknown>,
                        key,
                    ),
            });
        } catch {
            /* لا تُسرِّب TypeError إلى كونسول المتصفح عند ضغط إحلال/وفاة */
        }
    };
}
