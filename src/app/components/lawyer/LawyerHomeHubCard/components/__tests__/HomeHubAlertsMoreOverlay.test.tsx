import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubAlertsMoreOverlay } from '../HomeHubAlertsMoreOverlay';
import { resetHomeHubOverlayBackStackForTests } from '../../homeHub/homeHubOverlayBackStack';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../../NeuralAlertsCard/types';

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

const smart: SmartAlert = {
    id: 'upcoming-1',
    title: 'موعد قادم',
    description: '',
    priority: 'medium',
    actionType: 'openChecklist',
    actionLabel: 'فتح',
    payload: {},
    timestamp: 1,
    timeLabel: 'بعد غد',
    sectionLabel: 'دعوى',
};

const orphan: SmartAlert = {
    ...smart,
    id: 'orphan',
    title: 'بدون مصدر',
};

const source = {
    id: 'lawsuit:upcoming-1',
    title: 'موعد قادم',
    summary: '',
    dueAt: new Date().toISOString(),
    severity: 'medium',
    target: 'lawsuit',
    entityId: 'upcoming-1',
    clientName: 'ليلى',
} as SecretaryAlert;

describe('HomeHubAlertsMoreOverlay', () => {
    beforeEach(() => resetHomeHubOverlayBackStackForTests());
    afterEach(() => resetHomeHubOverlayBackStackForTests());

    it('يفتح الكيان ويغلق الورقة ويتجاهل بلا مصدر', () => {
        const onClose = vi.fn();
        const onOpenEntity = vi.fn();
        render(
            <HomeHubAlertsMoreOverlay
                open
                carouselAlerts={[smart, orphan]}
                sourceById={new Map([[smart.id, source]])}
                onClose={onClose}
                onOpenEntity={onOpenEntity}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );

        expect(screen.getByTestId('home-hub-alerts-more-overlay')).toHaveAttribute(
            'aria-label',
            'مواعيد قادمة — 2 عنصر',
        );
        expect(screen.queryByTestId('home-hub-alert-row-orphan')).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'موعد قادم — بعد غد' }));
        expect(onOpenEntity).toHaveBeenCalledWith(source);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
