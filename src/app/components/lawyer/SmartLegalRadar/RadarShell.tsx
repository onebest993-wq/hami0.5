import React from 'react';
import { RADAR_PAGE } from './radarTheme';

/** خلفية معتمة — فحمي بلا تمرير لون اللوحة من تحت */
export const RadarBackground = React.memo(function RadarBackground() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden hami-radar-dark-surface" aria-hidden />
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