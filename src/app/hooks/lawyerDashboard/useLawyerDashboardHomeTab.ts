import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { warmHomeOnOpen } from '@/app/hooks/lawyerDashboard/homeIntentWarm';
import { prefetchLawyerHomeTabModule } from '@/app/runtime/homeHubLoader';
import {
    clearHomeHubPerfMarks,
    markHomeHubPerfPhase,
} from '@/app/services/alerts/homeHubPerfMetrics';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type UseLawyerDashboardHomeTabParams = {
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
};

export function useLawyerDashboardHomeTab({ activeTab, setActiveTab }: UseLawyerDashboardHomeTabParams) {
    const [homeLayoutEditMode, setHomeLayoutEditMode] = useState(false);
    const wasHomeTabVisibleRef = useRef(false);

    const primeHomeTabMount = useCallback(() => {
        prefetchLawyerHomeTabModule();
        warmHomeOnOpen();
    }, []);

    useEffect(() => {
        if (activeTab !== 'home') return;
        prefetchLawyerHomeTabModule();
    }, [activeTab]);

    useEffect(() => {
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
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'home-layout-edit') {
                setHomeLayoutEditMode(false);
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const exitHomeLayoutEdit = useCallback(() => {
        setHomeLayoutEditMode(false);
        releaseBodyScrollLock();
    }, []);

    const enterHomeLayoutEdit = useCallback(() => {
        dismissTransientOverlays('home-layout-edit');
        releaseBodyScrollLock();
        setActiveTab('home');
        setHomeLayoutEditMode(true);
    }, [setActiveTab]);

    return {
        homeLayoutEditMode,
        enterHomeLayoutEdit,
        exitHomeLayoutEdit,
        primeHomeTabMount,
        homeTabSessionKey: 0,
        homeHubCardSessionKey: 0,
        homeDockChromeSessionKey: 0,
    };
}
