import {
    normalizeLegacyFollowupTabOnOpen,
} from './followupLegacyTabNormalization';

export type FollowupModalTabId =
    | 'personal'
    | 'coercive'
    | 'financial'
    | 'seizure_requests'
    | 'other_party'
    | 'correspondences'
    | 'admin'
    | 'special'
    | 'dossier_controls';

export type FollowupModalPersistState = {
    tab?: string;
    scroll?: number;
};

export function readFollowupModalPersist(storageKey: string): FollowupModalPersistState {
    try {
        const raw = sessionStorage.getItem(storageKey);
        if (!raw) return {};
        return JSON.parse(raw) as FollowupModalPersistState;
    } catch {
        return {};
    }
}

export function writeFollowupModalPersist(
    storageKey: string,
    patch: FollowupModalPersistState
): void {
    try {
        const prev = readFollowupModalPersist(storageKey);
        sessionStorage.setItem(storageKey, JSON.stringify({ ...prev, ...patch }));
    } catch {
        /* ignore quota / private mode */
    }
}

/** يحدد التبويب عند فتح محضر المتابعة دون وميض تبويبات غير صالحة */
export function resolveFollowupTabOnOpen(input: {
    explicitTab?: FollowupModalTabId;
    savedTab?: string;
    allowedTabOrder: readonly string[];
}): { tab: FollowupModalTabId | null; routeSeizureRequests: boolean } {
    const { explicitTab, savedTab, allowedTabOrder } = input;

    const explicitLegacy = normalizeLegacyFollowupTabOnOpen(explicitTab);
    if (explicitLegacy.routeSeizureRequests) {
        return { tab: null, routeSeizureRequests: true };
    }
    if (explicitLegacy.tab && allowedTabOrder.includes(explicitLegacy.tab)) {
        return { tab: explicitLegacy.tab as FollowupModalTabId, routeSeizureRequests: false };
    }

    if (explicitTab === 'seizure_requests') {
        return { tab: null, routeSeizureRequests: true };
    }
    if (explicitTab && allowedTabOrder.includes(explicitTab)) {
        return { tab: explicitTab, routeSeizureRequests: false };
    }

    const savedLegacy = normalizeLegacyFollowupTabOnOpen(savedTab);
    if (savedLegacy.routeSeizureRequests) {
        return { tab: null, routeSeizureRequests: true };
    }
    if (savedLegacy.tab && allowedTabOrder.includes(savedLegacy.tab)) {
        return { tab: savedLegacy.tab as FollowupModalTabId, routeSeizureRequests: false };
    }

    if (savedTab === 'seizure_requests') {
        return { tab: null, routeSeizureRequests: true };
    }
    if (savedTab && allowedTabOrder.includes(savedTab)) {
        return { tab: savedTab as FollowupModalTabId, routeSeizureRequests: false };
    }

    const first = allowedTabOrder[0];
    if (first) {
        return { tab: first as FollowupModalTabId, routeSeizureRequests: false };
    }
    return { tab: 'correspondences', routeSeizureRequests: false };
}
