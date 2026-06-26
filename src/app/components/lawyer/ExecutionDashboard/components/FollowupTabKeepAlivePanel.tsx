import React, { Suspense } from 'react';
import { EXEC_SECTION_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';

export type FollowupTabPanelKey =
    | 'personal'
    | 'coercive'
    | 'financial'
    | 'other_party'
    | 'seizure_requests'
    | 'correspondences'
    | 'dossier_controls'
    | 'admin';

type FollowupTabKeepAlivePanelProps = {
    panelId: FollowupTabPanelKey;
    active: boolean;
    children: React.ReactNode;
    className?: string;
    dir?: 'rtl' | 'ltr';
};

/** يُبقي محتوى التبويب في DOM ويخفيه بـ hidden — يمنع unmount والوميض عند التنقل */
export function FollowupTabKeepAlivePanel({
    panelId,
    active,
    children,
    className,
    dir,
}: FollowupTabKeepAlivePanelProps) {
    return (
        <div
            role="tabpanel"
            id={`followup-tabpanel-${panelId}`}
            aria-labelledby={`followup-tab-${panelId}`}
            hidden={!active}
            dir={dir}
            className={active ? className : 'hidden'}
            data-followup-tab-panel={panelId}
        >
            <Suspense fallback={EXEC_SECTION_LAZY_FALLBACK}>{children}</Suspense>
        </div>
    );
}
