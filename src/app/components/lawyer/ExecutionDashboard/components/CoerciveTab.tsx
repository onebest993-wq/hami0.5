import React from 'react';
import { CoerciveTabReady } from './CoerciveTabReady';

export type { CoerciveTabProps } from './CoerciveTab.types';
import type { CoerciveTabProps } from './CoerciveTab.types';

export const CoerciveTab: React.FC<CoerciveTabProps> = (props) => <CoerciveTabReady {...props} />;
