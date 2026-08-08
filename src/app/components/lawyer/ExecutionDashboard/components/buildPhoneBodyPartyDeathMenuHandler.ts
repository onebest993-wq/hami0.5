import type { MutableRefObject } from 'react';
import {
    isExecutionHandlerStubLeaf,
} from '../hooks/executionHandlerClusterStubs';
import { prefetchExecutionHandlerClusterPartyDeathBridge } from '../executionDashboardHandlerClusterBridgeLazy';

type PartyDeathMenuKey = 'handleDebtorDeathMenuAction' | 'handleCreditorDeathMenuAction';

function readPartyDeathHandler(
    source: Record<string, unknown>,
    key: PartyDeathMenuKey,
): ((...args: unknown[]) => unknown) | null {
    const direct = source[key];
    if (typeof direct === 'function' && !isExecutionHandlerStubLeaf(direct)) {
        return direct as (...args: unknown[]) => unknown;
    }
    const bag = source.partyDeathHandlers;
    if (bag && typeof bag === 'function' && isExecutionHandlerStubLeaf(bag)) {
        const stubLeaf = (bag as Record<string, unknown>)[key];
        if (typeof stubLeaf === 'function' && !isExecutionHandlerStubLeaf(stubLeaf)) {
            return stubLeaf as (...args: unknown[]) => unknown;
        }
        return null;
    }
    if (bag && typeof bag === 'object' && !Array.isArray(bag)) {
        const nested = (bag as Record<string, unknown>)[key];
        if (typeof nested === 'function' && !isExecutionHandlerStubLeaf(nested)) {
            return nested as (...args: unknown[]) => unknown;
        }
    }
    return null;
}

export function buildPhoneBodyPartyDeathMenuHandler(
    scopeRef: MutableRefObject<Record<string, unknown>> | undefined,
    fallbackSource: Record<string, unknown>,
    key: PartyDeathMenuKey,
): () => void {
    return () => {
        const live = (scopeRef?.current ?? fallbackSource) as Record<string, unknown>;
        const handler = readPartyDeathHandler(live, key);
        if (handler) {
            handler();
            return;
        }
        const bag = live.partyDeathHandlers as Record<string, unknown> | undefined;
        const prefetch = bag?.prefetchPartyDeathHandlers;
        if (typeof prefetch === 'function' && !isExecutionHandlerStubLeaf(prefetch)) {
            prefetch();
        } else {
            void prefetchExecutionHandlerClusterPartyDeathBridge();
        }
        const showToast = live.showToast;
        if (typeof showToast === 'function') {
            showToast('جاري تجهيز أداة الإبلاغ عن الوفاة — أعد المحاولة بعد لحظة.', 'info');
        }
    };
}
