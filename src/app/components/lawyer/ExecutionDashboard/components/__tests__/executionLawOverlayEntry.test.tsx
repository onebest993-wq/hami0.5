import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';

vi.mock('@/app/components/lawyer/ExecutionDashboard/executionLawReferenceLazy', () => ({
    LazyLawReferencePanel: Object.assign(() => <div>live-law</div>, {
        isPreloaded: () => true,
        preload: () => Promise.resolve(),
    }),
}));

import { ExecutionLawOverlayEntry } from '../ExecutionLawOverlayEntry';

describe('ExecutionLawOverlayEntry', () => {
    beforeEach(() => {
        useExecutionDashboardStore.getState().closeAllModals();
    });

    it('لا يرسم شيئاً والإشارة مغلقة', () => {
        render(
            <ExecutionLawOverlayEntry isEvictionExecutionModule={false} viewExecutionData={null} />,
        );
        expect(screen.queryByText('live-law')).toBeNull();
        expect(screen.queryByTestId('execution-law-reference-panel')).toBeNull();
    });

    it('يرسم المرجع عند الفتح إن اكتمل التحميل المسبق', () => {
        useExecutionDashboardStore.getState().openModal('showLawReferencePanel');
        render(
            <ExecutionLawOverlayEntry isEvictionExecutionModule={false} viewExecutionData={null} />,
        );
        expect(screen.getByText('live-law')).toBeTruthy();
    });
});
