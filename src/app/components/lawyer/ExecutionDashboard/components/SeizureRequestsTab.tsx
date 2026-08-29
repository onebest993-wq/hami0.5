import React from 'react';
import { SeizureRequestsTabReady } from './SeizureRequestsTabReady';

export type { SeizureRequestsTabProps } from './SeizureRequestsTabReady';
import type { SeizureRequestsTabProps } from './SeizureRequestsTabReady';

export const SeizureRequestsTab: React.FC<SeizureRequestsTabProps> = (props) => (
    <SeizureRequestsTabReady {...props} />
);
