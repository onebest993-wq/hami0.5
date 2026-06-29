import React from 'react';

/** skeleton خفيف أثناء تحميل تبويب الاستوديو */
export function ProfileSettingsTabSkeleton() {
    return (
        <div className="space-y-3 py-1" aria-hidden data-testid="profile-settings-tab-skeleton">
            <div className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" />
            <div className="h-14 rounded-2xl bg-white/[0.04] animate-pulse" />
            <div className="h-10 rounded-xl bg-white/[0.03] animate-pulse w-2/3" />
        </div>
    );
}
