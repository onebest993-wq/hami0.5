import React from 'react';
import { RADAR_PAGE } from './radarTheme';

export const RadarShell = React.memo(function RadarShell({
    children,
    embed = false,
}: {
    children: React.ReactNode;
    embed?: boolean;
}) {
    if (embed) {
        return <div data-testid="radar-live-body">{children}</div>;
    }
    return (
        <div className={RADAR_PAGE} data-testid="smart-legal-radar">
            {children}
        </div>
    );
});
