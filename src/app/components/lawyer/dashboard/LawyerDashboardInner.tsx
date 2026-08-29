import React, { useRef } from 'react';
import { beginLawyerDashboardBootCycle } from '@/app/bootstrap/lawyerDashboardBootCycle';
import { discardPendingLawyerDashboardHeaderIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderIntentBridge';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import { LawyerSettingsBootProvider } from '@/app/context/lawyerSettings/LawyerSettingsBootProvider';
import { LawyerDashboardFullBootPath } from '@/app/components/lawyer/dashboard/LawyerDashboardFullBootPath';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps;

/**
 * حدّ lazy واحد من الجذع: Inner يسحب FullBoot+MainView+بلاطات المنزل ساكناً.
 */
export function LawyerDashboardInner(props: LawyerDashboardInnerProps) {
    const bootCycleStarted = useRef(false);
    if (!bootCycleStarted.current) {
        bootCycleStarted.current = true;
        beginLawyerDashboardBootCycle();
        discardPendingLawyerDashboardHeaderIntent();
    }
    const runtimePhase = useRuntimePhase();
    const backgroundRuntimeEnabled = runtimePhase !== 'boot';

    return (
        <LawyerSettingsBootProvider>
            <LawyerDashboardFullBootPath
                {...props}
                backgroundRuntimeEnabled={backgroundRuntimeEnabled}
            />
        </LawyerSettingsBootProvider>
    );
}
