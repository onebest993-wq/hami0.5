import React from 'react';
import { RADAR_PAGE } from './radarTheme';

export const RadarShell = React.memo(function RadarShell({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={RADAR_PAGE} data-testid="smart-legal-radar">
            {children}
        </div>
    );
});
