import React from 'react';
import { RADAR_PAGE } from './radarTheme';

export const RadarBackground = React.memo(function RadarBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#1f1712]" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-b from-[#2d2219]/40 via-[#1f1712] to-[#14100c]" />
            <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#C4956A]/12 blur-3xl" />
            <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full bg-[#F5EDE0]/[0.04] blur-3xl" />
            <div className="absolute bottom-32 right-1/4 w-48 h-48 rounded-full bg-[#A67B5B]/10 blur-3xl" />
        </div>
    );
});

export const RadarShell = React.memo(function RadarShell({
    children,
    loading,
}: {
    children: React.ReactNode;
    loading?: boolean;
}) {
    return (
        <div
            className={RADAR_PAGE}
            data-testid="smart-legal-radar"
            data-loading={loading ? 'true' : undefined}
        >
            <RadarBackground />
            {children}
        </div>
    );
});
