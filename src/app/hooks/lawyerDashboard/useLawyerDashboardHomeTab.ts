import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import {
    clearHomeHubPerfMarks,
    markHomeHubPerfPhase,
} from '@/app/services/alerts/homeHubPerfMetrics';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

function loadHomeIntentWarm() {
    return import('@/app/hooks/lawyerDashboard/homeIntentWarm');
}

export type UseLawyerDashboardHomeTabParams = {
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

export function useLawyerDashboardHomeTab({ activeTab, setActiveTab }: UseLawyerDashboardHomeTabParams) {
    const [homeLayoutEditMode, setHomeLayoutEditMode] = useState(false);
    const wasHomeTabVisibleRef = useRef(false);

    const primeHomeTabMount = useCallback(() => {
        prefetchLawyerHomeTabModule();
        void loadHomeIntentWarm()
            .then((m) => m.warmHomeOnOpen())
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        if (activeTab !== 'home') return;
        prefetchLawyerHomeTabModule();
    }, [activeTab]);

    useLayoutEffect(() => {
        const isHome = activeTab === 'home';
        if (!isHome && wasHomeTabVisibleRef.current) {
            clearHomeHubPerfMarks();
        }
        if (isHome && !wasHomeTabVisibleRef.current) {
            markHomeHubPerfPhase('open-request');
            primeHomeTabMount();
        }
        wasHomeTabVisibleRef.current = isHome;
    }, [activeTab, primeHomeTabMount]);

    useEffect(() => {
        return registerDashboardOverlayCloser('home-layout-edit', () => {
            setHomeLayoutEditMode(false);
        });
    }, []);

    const exitHomeLayoutEdit = useCallback(() => {
        setHomeLayoutEditMode(false);
    }, []);

    const enterHomeLayoutEdit = useCallback(() => {
        dismissTransientOverlays('home-layout-edit');
        setActiveTab('home');
        setHomeLayoutEditMode(true);
    }, [setActiveTab]);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eEnterHomeLayoutEdit?: () => void;
        };
        w.__hamiE2eEnterHomeLayoutEdit = () => enterHomeLayoutEdit();
        return () => {
            delete w.__hamiE2eEnterHomeLayoutEdit;
        };
    }, [enterHomeLayoutEdit]);

    return {
        homeLayoutEditMode,
        enterHomeLayoutEdit,
        exitHomeLayoutEdit,
        primeHomeTabMount,
        homeTabSessionKey: 0,
        homeDockChromeSessionKey: 0,
    };
}
