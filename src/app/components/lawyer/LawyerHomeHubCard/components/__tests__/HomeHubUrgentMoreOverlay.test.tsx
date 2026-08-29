import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubUrgentMoreOverlay } from '../HomeHubUrgentMoreOverlay';
import { resetHomeHubOverlayBackStackForTests } from '../../homeHub/homeHubOverlayBackStack';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../../NeuralAlertsCard/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';

vi.mock('@/app/utils/bodyScrollLock', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/utils/bodyScrollLock')>();
    return {
        ...actual,
        useBodyScrollLock: vi.fn(),
    };
});

vi.mock('@/app/runtime/capacitorAppLifecycle', () => ({
    registerNativeBackHandler: () => () => undefined,
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    executeOverlaySnapClose: ({ commit }: { commit?: () => void }) => {
        commit?.();
    },
}));

const radar: CalendarRadarEvent = {
    id: 'radar-ov',
    title: 'جلسة عاجلة',
    whenLabel: 'اليوم 3:00 م',
    dateLabel: 'اليوم',
    timeLabel: '3:00 م',
    sourceModuleLabel: 'دعوى',
    sourcePlace: 'محكمة الكرخ',
    caseNo: '1/2026',
    routePath: 'workspace:lawsuit:radar-ov',
};

const smart: SmartAlert = {
    id: 'alert-ov',
    title: 'تنبيه عاجل',
    description: '',
    priority: 'high',
    actionType: 'openChecklist',
    actionLabel: 'فتح',
    payload: {},
    timestamp: 1,
    timeLabel: 'اليوم',
    sectionLabel: 'دعوى',
};

const source = {
    id: 'lawsuit:ov',
    title: 'تنبيه عاجل',
    summary: '',
    dueAt: new Date().toISOString(),
    severity: 'high',
    target: 'lawsuit',
    entityId: 'ov',
    clientName: 'أحمد',
} as SecretaryAlert;

describe('HomeHubUrgentMoreOverlay', () => {
    beforeEach(() => resetHomeHubOverlayBackStackForTests());
    afterEach(() => resetHomeHubOverlayBackStackForTests());

    it('التنقّل من الرادار أو التنبيه يغلق الورقة؛ التجاهل يبقيها', () => {
        const onClose = vi.fn();
        const onNavigate = vi.fn();
        const onOpenEntity = vi.fn();
        const onDismissRadar = vi.fn();
        render(
            <HomeHubUrgentMoreOverlay
                open
                radarEvents={[radar]}
                carouselAlerts={[smart]}
                sourceById={new Map([[smart.id, source]])}
                onClose={onClose}
                onNavigate={onNavigate}
                onDismissRadar={onDismissRadar}
                onOpenEntity={onOpenEntity}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );

        fireEvent.click(screen.getByTestId('home-hub-radar-item-radar-ov'));
        expect(onNavigate).toHaveBeenCalledWith('workspace:lawsuit:radar-ov');
        expect(onClose).toHaveBeenCalledTimes(1);

        onClose.mockClear();
        fireEvent.click(screen.getByRole('button', { name: 'تنبيه عاجل — اليوم' }));
        expect(onOpenEntity).toHaveBeenCalledWith(source);
        expect(onClose).toHaveBeenCalledTimes(1);

        onClose.mockClear();
        fireEvent.click(screen.getByTestId('home-hub-radar-dismiss-radar-ov'));
        expect(onDismissRadar).toHaveBeenCalledWith('radar-ov');
        expect(onClose).not.toHaveBeenCalled();
    });
});
