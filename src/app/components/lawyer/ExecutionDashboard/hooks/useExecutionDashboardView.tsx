/** عرض رفيع — يوكّل السلسلة الحيّة: ViewResolved → RuntimeSurface → ChunkHost */
import React from 'react';
import type { ExecutionDashboardProps } from '../types';
import { ExecutionDashboardViewResolved } from './ExecutionDashboardViewResolved';

export const ExecutionDashboardView = React.memo(function ExecutionDashboardView(
    props: ExecutionDashboardProps,
) {
    return <ExecutionDashboardViewResolved {...props} />;
});
