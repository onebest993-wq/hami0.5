import React, { useLayoutEffect, useSyncExternalStore } from 'react';
import { LawyerHomeTabErrorBoundary } from './LawyerHomeTabErrorBoundary';
import { HomeMainGridFirstPaint } from './HomeMainGridFirstPaint';
import { HomeTabPaintShell } from './HomeTabPaintShell';
import type { LawyerDashboardHomeTabProps } from './lawyerDashboardHomeTab.types';
import {
    getHomeTabContentSync,
    loadHomeTabContent,
    subscribeHomeTabContent,
} from '@/app/runtime/homeTabContentLoader';
import {
    isHomeBootChromeReady,
    subscribeHomeBootChrome,
} from '@/app/bootstrap/homeBootChromeState';
import { activateHomeFirstPaintWidget } from './activateHomeFirstPaintWidget';
import { bindDockWidgetPointerHandlers } from '@/app/hooks/lawyerDashboard/dockShellPrefetchGate';

export type { LawyerDashboardHomeTabProps };

function useHomeTabLiveModule() {
    const content = useSyncExternalStore(
        subscribeHomeTabContent,
        getHomeTabContentSync,
        getHomeTabContentSync,
    );

    useLayoutEffect(() => {
        if (!content) void loadHomeTabContent();
        /* البلاطات: useCommandHubTiles داخل المحتوى + prefetch الشبكة — بلا اشتراك مزدوج هنا */
    }, [content]);

    return content ? content : null;
}

function useHomeBootChromeReady(): boolean {
    return useSyncExternalStore(subscribeHomeBootChrome, isHomeBootChromeReady, isHomeBootChromeReady);
}

function HomeTabContentEntry(props: LawyerDashboardHomeTabProps) {
    const chromeReady = useHomeBootChromeReady();
    const content = useHomeTabLiveModule();
    if (!chromeReady || !content) {
        return (
            <HomeMainGridFirstPaint
                visible={props.visible}
                themePrimary={props.theme.primary ?? '#E6C673'}
                onActivateWidget={(id) => activateHomeFirstPaintWidget(id, props)}
                bindPointer={bindDockWidgetPointerHandlers}
            />
        );
    }
    return <content.HomeTabContent {...props} />;
}

export function LawyerDashboardHomeTab({
    visible,
    announceBootReveal = false,
    ...rest
}: LawyerDashboardHomeTabProps) {
    return (
        <HomeTabPaintShell visible={visible}>
            <LawyerHomeTabErrorBoundary>
                <HomeTabContentEntry
                    visible={visible}
                    announceBootReveal={announceBootReveal}
                    {...rest}
                />
            </LawyerHomeTabErrorBoundary>
        </HomeTabPaintShell>
    );
}
