import React from 'react';
import type { ActiveOrderFileProps } from './types';
import { ActiveOrderFileView } from './layout/ActiveOrderFileView';
import { useActiveOrderFileOrchestration } from './hooks/useActiveOrderFileOrchestration';

/**
 * Dashboard الأمر الولائي — shell رفيع؛ المنطق في useActiveOrderFileOrchestration
 */
export const Dashboard_Active_Order_File: React.FC<ActiveOrderFileProps> = (props) => {
    const viewProps = useActiveOrderFileOrchestration(props);
    return <ActiveOrderFileView {...viewProps} />;
};
