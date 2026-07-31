import React, { Suspense } from 'react';

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
            <Suspense
                fallback={
                    <div
                        className="min-h-[8rem] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
                        aria-busy="true"
                        aria-label="جاري تحميل محتوى التبويب"
                    />
                }
            >
                {children}
            </Suspense>
        </div>
    );
}
