import { useCallback, useEffect, useRef, useState } from 'react';

import {
    resolveDefaultHomeHubPanel,
    type HomeHubPanel,
} from '@/app/services/alerts/homeHubCardLogic';

export type UseHomeHubPanelStateResult = {
    hubPanel: HomeHubPanel;
    selectHubPanel: (panel: HomeHubPanel) => void;
};

export function useHomeHubPanelState(
    alertsTabCount: number,
    secretaryTabCount: number,
    pinsCount: number,
): UseHomeHubPanelStateResult {
    const [hubPanel, setHubPanelState] = useState<HomeHubPanel>(() =>
        resolveDefaultHomeHubPanel(alertsTabCount, secretaryTabCount, pinsCount),
    );
    const panelInitRef = useRef(
        alertsTabCount > 0 || secretaryTabCount > 0 || pinsCount > 0,
    );

    const selectHubPanel = useCallback((panel: HomeHubPanel) => {
        setHubPanelState(panel);
    }, []);

    useEffect(() => {
        if (panelInitRef.current) return;
        if (alertsTabCount === 0 && secretaryTabCount === 0 && pinsCount === 0) return;
        panelInitRef.current = true;
        setHubPanelState(resolveDefaultHomeHubPanel(alertsTabCount, secretaryTabCount, pinsCount));
    }, [alertsTabCount, secretaryTabCount, pinsCount]);

    return { hubPanel, selectHubPanel };
}
