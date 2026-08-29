import { useCallback, useRef, useState } from 'react';

import {
    reconcileHomeHubPanelAfterCounts,
    resolveDefaultHomeHubPanel,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';
import {
    persistHomeHubPanel,
    readPersistedHomeHubPanel,
} from '@/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubPanelSession';

type UseHomeHubPanelStateOptions = {
    /**
     * عند false: لا يُعاد حل التبويب الافتراضي — يبقى على الجلسة أو alerts.
     */
    badgeCountsSettled?: boolean;
};

type UseHomeHubPanelStateResult = {
    hubPanel: HomeHubPanel;
    selectHubPanel: (panel: HomeHubPanel) => void;
};

function resolveInitialHomeHubPanel(
    alertsTabCount: number,
    pinsCount: number,
    badgeCountsSettled: boolean,
): HomeHubPanel {
    const persisted = readPersistedHomeHubPanel();
    if (persisted) return persisted;
    if (!badgeCountsSettled) return 'alerts';
    return resolveDefaultHomeHubPanel(alertsTabCount, pinsCount);
}

export function useHomeHubPanelState(
    alertsTabCount: number,
    pinsCount: number,
    options?: UseHomeHubPanelStateOptions,
): UseHomeHubPanelStateResult {
    const badgeCountsSettled = options?.badgeCountsSettled ?? true;
    const persistedOnMount = useRef(readPersistedHomeHubPanel());

    const [hubPanel, setHubPanelState] = useState<HomeHubPanel>(() =>
        resolveInitialHomeHubPanel(alertsTabCount, pinsCount, badgeCountsSettled),
    );
    const panelInitRef = useRef(Boolean(persistedOnMount.current) || badgeCountsSettled);
    const userChoseRef = useRef(Boolean(persistedOnMount.current));

    const selectHubPanel = useCallback((panel: HomeHubPanel) => {
        userChoseRef.current = true;
        panelInitRef.current = true;
        persistHomeHubPanel(panel);
        setHubPanelState(panel);
    }, []);

    const reconciled = reconcileHomeHubPanelAfterCounts({
        userChose: userChoseRef.current,
        badgeCountsSettled,
        panelInit: panelInitRef.current,
        hubPanel,
        alertsTabCount,
        pinsCount,
    });
    if (reconciled) {
        if (reconciled.markInit) panelInitRef.current = true;
        persistHomeHubPanel(reconciled.nextPanel);
        if (reconciled.nextPanel !== hubPanel) {
            setHubPanelState(reconciled.nextPanel);
        }
    }

    return { hubPanel, selectHubPanel };
}
