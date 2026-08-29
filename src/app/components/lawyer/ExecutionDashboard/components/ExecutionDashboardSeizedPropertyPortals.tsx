/** Seized property inline portals — مستخرج من ExecutionDashboard */
import React from 'react';
import { SeizedPropertyStepPortal } from './seizedPropertyPortals/SeizedPropertyStepPortal';
import { SeizedPropertyAuctionResultPortal } from './seizedPropertyPortals/SeizedPropertyAuctionResultPortal';
import { SeizureMarkPortal } from './seizedPropertyPortals/SeizureMarkPortal';
import { PublicationPortal } from './seizedPropertyPortals/PublicationPortal';

export type ExecutionDashboardSeizedPropertyPortalsProps = Record<string, unknown>;

export function ExecutionDashboardSeizedPropertyPortals(props: ExecutionDashboardSeizedPropertyPortalsProps) {
    return (
        <>
            <SeizedPropertyStepPortal {...props} />
            <SeizedPropertyAuctionResultPortal {...props} />
            <SeizureMarkPortal {...props} />
            <PublicationPortal {...props} />
        </>
    );
}
