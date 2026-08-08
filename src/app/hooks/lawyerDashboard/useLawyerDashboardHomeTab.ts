import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
} from 'react';

import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import { prefetchLawyerHomeHubCardModule } from '@/app/runtime/homeHubCardLoader';
import { markHomeHubPerfPhase } from '@/app/services/alerts/homeHubPerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

function loadHomeIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/homeIntentWarm');
}

export type UseLawyerDashboardHomeTabParams = {
    activeTab: LawyerDashboardTab;
};

export function useLawyerDashboardHomeTab({ activeTab }: UseLawyerDashboardHomeTabParams) {
    const wasHomeTabVisibleRef = useRef(false);

    const primeHomeTabMount = useCallback(() => {
        prefetchLawyerHomeTabModule();
        prefetchLawyerHomeHubCardModule();
        void loadHomeIntentWarm()
            .then((m) => m.warmHomeOnOpen())
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        prefetchLawyerHomeHubCardModule();
    }, []);

    useEffect(() => {
        if (activeTab !== 'home') return;
        prefetchLawyerHomeTabModule();
        prefetchLawyerHomeHubCardModule();
    }, [activeTab]);

    useLayoutEffect(() => {
        const isHome = activeTab === 'home';
        if (isHome && !wasHomeTabVisibleRef.current) {
            markHomeHubPerfPhase('open-request');
            primeHomeTabMount();
        }
        wasHomeTabVisibleRef.current = isHome;
    }, [activeTab, primeHomeTabMount]);

    return {
        primeHomeTabMount,
        homeTabSessionKey: 0,
        homeDockChromeSessionKey: 0,
    };
}
