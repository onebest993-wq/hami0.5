import React, { Suspense, lazy } from 'react';
import type { CaseShareRecord } from '@/app/services/caseShare/caseShareTypes';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import type { NotificationTab, TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';
import type { NotificationPanelBodyView } from '@/app/components/lawyer/NotificationPanel/utils/resolveNotificationPanelBodyView';
import { NotificationTabPanelBody } from '@/app/components/lawyer/NotificationPanel/components/NotificationTabPanelBody';
import { loadCaseSharePanelSectionModule } from '@/app/components/lawyer/NotificationPanel/notificationPanelLazyModules';

const CaseSharePanelSectionLazy = lazy(() =>
    loadCaseSharePanelSectionModule().then((m) => ({ default: m.CaseSharePanelSection })),
);

type Props = {
    userId: string;
    hasCaseShareContent: boolean;
    caseShareAll: CaseShareRecord[];
    onCaseShareChanged: () => void;
    activeTab: NotificationTab;
    view: NotificationPanelBodyView;
    groupedByTime: Record<TimeBucket, NotificationModel[]>;
    onTap: (notification: NotificationModel) => void;
    onScan: (event: React.MouseEvent) => void;
    contentArmed: boolean;
    ensureId?: string | null;
};

/** جسم مسار الوارد: مشاركات (lazy) + قائمة التبويب */
export function NotificationInboxRouteBody({
    userId,
    hasCaseShareContent,
    caseShareAll,
    onCaseShareChanged,
    activeTab,
    view,
    groupedByTime,
    onTap,
    onScan,
    contentArmed,
    ensureId,
}: Props) {
    return (
        <>
            {contentArmed && hasCaseShareContent ? (
                <Suspense fallback={null}>
                    <CaseSharePanelSectionLazy
                        userId={userId}
                        shares={caseShareAll}
                        onChanged={onCaseShareChanged}
                    />
                </Suspense>
            ) : null}
            <NotificationTabPanelBody
                activeTab={activeTab}
                view={view}
                groupedByTime={groupedByTime}
                onTap={onTap}
                onScan={onScan}
                listActive={contentArmed}
                ensureId={ensureId}
            />
        </>
    );
}
