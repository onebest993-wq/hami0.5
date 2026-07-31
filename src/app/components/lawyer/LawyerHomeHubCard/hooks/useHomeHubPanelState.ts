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
    pinsCount: number,
): UseHomeHubPanelStateResult {
    const [hubPanel, setHubPanelState] = useState<HomeHubPanel>('alerts');
    const panelInitRef = useRef(false);

    const selectHubPanel = useCallback((panel: HomeHubPanel) => {
        setHubPanelState(panel);
        requestAnimationFrame(() => {
            document.getElementById(`home-hub-tab-${panel}`)?.focus();
        });
    }, []);

    useEffect(() => {
        if (panelInitRef.current) return;
        if (alertsTabCount === 0 && pinsCount === 0) return;
        panelInitRef.current = true;
        setHubPanelState(resolveDefaultHomeHubPanel(alertsTabCount, pinsCount));
    }, [alertsTabCount, pinsCount]);

    return { hubPanel, selectHubPanel };
}
