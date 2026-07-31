import { useEffect, useState } from 'react';
import {
    preloadCriminalDashboardShellSurfaces,
    preloadCriminalDashboardSecondaryShellSurfaces,
} from './criminalDashboardLazyRegistry';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { subscribeCriminalModalsHostPrime } from './criminalModalsHostPrime';

/** prefetch شاشة الإضبارة + تركيب مضيف المودالات عند idle أو عند فتح مودال. */
export function useCriminalDashboardShellPrefetch(forceModalsHost: boolean) {
    const [modalsHostMounted, setModalsHostMounted] = useState(false);

    useEffect(() => {
        preloadCriminalDashboardShellSurfaces();
        void import('./CriminalDashboardModalsHost').catch(() => undefined);
        const cancelSecondary = scheduleIdleWork(() => {
            preloadCriminalDashboardSecondaryShellSurfaces();
        }, 1800);
        const cancelModals = scheduleIdleWork(() => {
            setModalsHostMounted(true);
        }, 280);
        const unsubPrime = subscribeCriminalModalsHostPrime(() => setModalsHostMounted(true));
        return () => {
            cancelSecondary();
            cancelModals();
            unsubPrime();
        };
    }, []);

    useEffect(() => {
        if (forceModalsHost) setModalsHostMounted(true);
    }, [forceModalsHost]);

    return { modalsHostMounted, setModalsHostMounted };
}
