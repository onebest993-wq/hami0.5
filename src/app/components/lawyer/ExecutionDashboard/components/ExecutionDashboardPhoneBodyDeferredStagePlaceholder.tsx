import React from 'react';

export function ExecutionDashboardPhoneBodyDeferredStagePlaceholder({
    className = 'mx-3 mt-3',
}: {
    className?: string;
}) {
    return (
        <div className={className} aria-hidden="true">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-3 py-3">
                <div className="h-3 w-24 rounded-full bg-white/10" />
                <div className="mt-2 h-10 rounded-2xl bg-white/[0.04]" />
            </div>
        </div>
    );
}
