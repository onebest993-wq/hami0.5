import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
} from 'react';

import { isDashboardInteractive, onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { markHomeHubPerfPhase } from '@/app/services/alerts/homeHubPerfMetrics';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

function loadHomeHubCardLoader() {
    return import('@/app/runtime/homeHubCardLoader');
}

function loadHomeIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/homeIntentWarm');
}

type UseLawyerDashboardHomeTabParams = {
    activeTab: LawyerDashboardTab;
};

export function useLawyerDashboardHomeTab({ activeTab }: UseLawyerDashboardHomeTabParams) {
    const wasHomeTabVisibleRef = useRef(false);

    const primeHomeTabMount = useCallback(() => {
        void loadHomeHubCardLoader()
            .then((m) => m.prefetchLawyerHomeHubCardModule())
            .catch(() => undefined);
        const warmIntent = () => {
            void loadHomeIntentWarm()
                .then((m) => m.warmHomeOnOpen())
                .catch(() => undefined);
        };
        if (isDashboardInteractive()) warmIntent();
        else onDashboardInteractive(warmIntent);
    }, []);

    useLayoutEffect(() => {
        const isHome = activeTab === 'home';
        if (isHome && !wasHomeTabVisibleRef.current) {
            markHomeHubPerfPhase('open-request');
        }
        wasHomeTabVisibleRef.current = isHome;
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'home') return;
        primeHomeTabMount();
    }, [activeTab, primeHomeTabMount]);

    return {
        primeHomeTabMount,
    };
}
