import React, { Suspense, lazy } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import type { NotificationTab, TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import type { NotificationPanelBodyView } from '@/app/components/lawyer/NotificationPanel/utils/resolveNotificationPanelBodyView';
import type { NotificationPanelRoute } from '@/app/components/lawyer/NotificationPanel/notificationPanelRoute';
import { NotificationInboxRouteBody } from '@/app/components/lawyer/NotificationPanel/components/NotificationInboxRouteBody';
import { AlertControlsRouteFallback } from '@/app/components/lawyer/NotificationPanel/components/AlertControlsRouteFallback';
import {
    getCachedNotificationAlertControls,
    loadNotificationAlertControlsModule,
} from '@/app/components/lawyer/NotificationPanel/notificationPanelLazyModules';
import { inertProps } from '@/app/utils/inertProps';

const NotificationAlertControlsLazy = lazy(() =>
    loadNotificationAlertControlsModule().then((m) => ({ default: m.NotificationAlertControls })),
);

type Props = {
    panelRoute: NotificationPanelRoute;
    isInboxRoute: boolean;
    /** محفوظ للتوافق مع المستدعي — التبديل فوري بلا انتظار خروج */
    reduceMotion?: boolean;
    userId: string;
    hasCaseShareContent: boolean;
    caseShareAll: CaseShareRecord[];
    onCaseShareChanged: () => void;
    activeTab: NotificationTab;
    view: NotificationPanelBodyView;
    groupedByTime: Record<TimeBucket, NotificationModel[]>;
    onTap: (notification: NotificationModel) => void;
    onScan: (event: React.MouseEvent) => void;
    tabSwipeHandlers: Record<string, unknown>;
    contentArmed: boolean;
    ensureId?: string | null;
};

/**
 * منطقة التمرير — المساران مركّبان داخل نفس الورقة.
 * التبديل CSS داخل الدرج دون انتظار خروج مسار سابق.
 */
export function NotificationPanelScrollRegion({
    isInboxRoute,
    userId,
    hasCaseShareContent,
    caseShareAll,
    onCaseShareChanged,
    activeTab,
    view,
    groupedByTime,
    onTap,
    onScan,
    tabSwipeHandlers,
    contentArmed,
    ensureId,
}: Props) {
    return (
        <div
            id="notification-panel-tabpanel"
            role="tabpanel"
            aria-labelledby={
                isInboxRoute ? `notification-tab-${activeTab}` : 'notification-alert-controls-title'
            }
            className="hami-notif-scroll min-h-0 overflow-y-auto overscroll-contain px-4 py-3 touch-pan-y"
            data-testid="notification-panel-tabpanel"
            {...(isInboxRoute ? tabSwipeHandlers : {})}
        >
            <div
                className="hami-notif-route-switch min-h-0"
                data-route={isInboxRoute ? 'inbox' : 'alert-controls'}
            >
                <div
                    className="hami-notif-route-pane"
                    data-active={isInboxRoute ? 'true' : 'false'}
                    aria-hidden={!isInboxRoute}
                    {...inertProps(!isInboxRoute)}
                >
                    <NotificationInboxRouteBody
                        userId={userId}
                        hasCaseShareContent={hasCaseShareContent}
                        caseShareAll={caseShareAll}
                        onCaseShareChanged={onCaseShareChanged}
                        activeTab={activeTab}
                        view={view}
                        groupedByTime={groupedByTime}
                        onTap={onTap}
                        onScan={onScan}
                        contentArmed={contentArmed}
                        ensureId={ensureId}
                    />
                </div>
                <div
                    className="hami-notif-route-pane"
                    data-active={isInboxRoute ? 'false' : 'true'}
                    aria-hidden={isInboxRoute}
                    {...inertProps(isInboxRoute)}
                >
                    {contentArmed ? <NotificationAlertControlsRoute /> : null}
                </div>
            </div>
        </div>
    );
}

function NotificationAlertControlsRoute() {
    const CachedAlert = getCachedNotificationAlertControls();
    if (CachedAlert) return <CachedAlert />;
    return (
        <Suspense fallback={<AlertControlsRouteFallback />}>
            <NotificationAlertControlsLazy />
        </Suspense>
    );
}
