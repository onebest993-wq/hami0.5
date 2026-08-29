import React from 'react';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { LazyLawReferencePanel } from '@/app/components/lawyer/ExecutionDashboard/executionLawReferenceLazy';
import { PreloadableOverlayGate } from '@/app/components/lawyer/ExecutionDashboard/preloadableOverlayGate';
import { ExecutionLawInstantFrame } from './executionOverlayInstantPresets';

/**
 * مرجع القانون — يُركَّب فقط عند الفتح حتى لا يومض الهيكل على كل إضبارة.
 */
export function ExecutionLawOverlayEntry({
    isEvictionExecutionModule,
    viewExecutionData,
}: {
    isEvictionExecutionModule: boolean;
    viewExecutionData: Record<string, unknown> | null | undefined;
}): React.ReactElement | null {
    const open = useExecutionDashboardStore((s) => s.modals.showLawReferencePanel);
    if (!open) return null;

    return (
        <PreloadableOverlayGate
            lazy={LazyLawReferencePanel}
            lazyProps={{ isEvictionExecutionModule, viewExecutionData }}
            fallback={<ExecutionLawInstantFrame />}
        />
    );
}
