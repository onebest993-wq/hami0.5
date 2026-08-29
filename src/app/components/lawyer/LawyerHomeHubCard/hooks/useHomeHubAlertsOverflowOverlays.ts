import { useEffect, useState } from 'react';

export function useHomeHubAlertsOverflowOverlays({
    isUrgentTab,
    urgentOverflowCount,
    upcomingOverflowCount,
    prefetchUrgent,
    prefetchUpcoming,
}: {
    isUrgentTab: boolean;
    urgentOverflowCount: number;
    upcomingOverflowCount: number;
    prefetchUrgent: () => void;
    prefetchUpcoming: () => void;
}): {
    urgentOverlayOpen: boolean;
    upcomingOverlayOpen: boolean;
    overflowCount: number;
    expanded: boolean;
    openOverflow: () => void;
    closeUrgent: () => void;
    closeUpcoming: () => void;
    prefetchActive: () => void;
} {
    const [urgentOverlayOpen, setUrgentOverlayOpen] = useState(false);
    const [upcomingOverlayOpen, setUpcomingOverlayOpen] = useState(false);

    useEffect(() => {
        if (isUrgentTab && urgentOverflowCount > 0) prefetchUrgent();
    }, [isUrgentTab, prefetchUrgent, urgentOverflowCount]);

    useEffect(() => {
        if (!isUrgentTab && upcomingOverflowCount > 0) prefetchUpcoming();
    }, [isUrgentTab, prefetchUpcoming, upcomingOverflowCount]);

    useEffect(() => {
        if (urgentOverflowCount <= 0) setUrgentOverlayOpen(false);
    }, [urgentOverflowCount]);

    useEffect(() => {
        if (upcomingOverflowCount <= 0) setUpcomingOverlayOpen(false);
    }, [upcomingOverflowCount]);

    const overflowCount = isUrgentTab ? urgentOverflowCount : upcomingOverflowCount;

    return {
        urgentOverlayOpen,
        upcomingOverlayOpen,
        overflowCount,
        expanded: isUrgentTab ? urgentOverlayOpen : upcomingOverlayOpen,
        openOverflow: () => {
            if (isUrgentTab) setUrgentOverlayOpen(true);
            else setUpcomingOverlayOpen(true);
        },
        closeUrgent: () => setUrgentOverlayOpen(false),
        closeUpcoming: () => setUpcomingOverlayOpen(false),
        prefetchActive: isUrgentTab ? prefetchUrgent : prefetchUpcoming,
    };
}
