import React from 'react';

export function ExecutionDashboardPhoneBodyDeferredStagePlaceholder({
    className = 'mx-3 mt-3',
}: {
    className?: string;
}) {
    return (
        <div className={className} aria-hidden="true">
            <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-3">
                <div className="h-11 min-h-[44px] rounded-lg bg-white/[0.04]" />
            </div>
        </div>
    );
}
