import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubAlertsList } from '../HomeHubAlertsList';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../../NeuralAlertsCard/types';
import { splitHomeHubUpcomingOverflow } from '../../homeHub/homeHubTabOverflow';

const smart: SmartAlert = {
    id: 'list-1',
    title: 'موعد القائمة',
    description: '',
    priority: 'medium',
    actionType: 'openChecklist',
    actionLabel: 'فتح',
    payload: {},
    timestamp: 1,
    timeLabel: 'بعد غد',
    sectionLabel: 'دعوى',
};

const source = {
    id: 'lawsuit:list-1',
    title: 'موعد القائمة',
    summary: '',
    dueAt: new Date().toISOString(),
    severity: 'medium',
    target: 'lawsuit',
    entityId: 'list-1',
    clientName: 'هدى',
} as SecretaryAlert;

describe('HomeHubAlertsList', () => {
    it('لا يرسم قائمة فارغة', () => {
        const { container } = render(
            <HomeHubAlertsList
                split={splitHomeHubUpcomingOverflow([])}
                sourceById={new Map()}
                onOpenEntity={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('يعرض المعاينة ويتخطى بلا مصدر', () => {
        const orphan: SmartAlert = { ...smart, id: 'no-source', title: 'يتيم' };
        render(
            <HomeHubAlertsList
                split={splitHomeHubUpcomingOverflow([smart, orphan])}
                sourceById={new Map([[smart.id, source]])}
                onOpenEntity={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );
        expect(screen.getByTestId('home-hub-alerts-list')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-alert-row-list-1')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-alert-row-no-source')).not.toBeInTheDocument();
    });
});
