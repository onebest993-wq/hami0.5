import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HomeHubUrgentTabContent } from '../HomeHubUrgentTabContent';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../../NeuralAlertsCard/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { splitHomeHubUrgentOverflow } from '../../homeHub/homeHubTabOverflow';

const radar: CalendarRadarEvent = {
    id: 'ev-tab',
    title: 'جلسة تبويب',
    whenLabel: 'اليوم 1:00 م',
    dateLabel: 'اليوم',
    timeLabel: '1:00 م',
    sourceModuleLabel: 'دعوى',
    routePath: 'workspace:lawsuit:ev-tab',
};

const smart: SmartAlert = {
    id: 'alert-tab',
    title: 'تنبيه تبويب',
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
    id: 'lawsuit:tab',
    title: 'تنبيه تبويب',
    summary: '',
    dueAt: new Date().toISOString(),
    severity: 'high',
    target: 'lawsuit',
    entityId: 'tab',
    clientName: 'نادر',
} as SecretaryAlert;

describe('HomeHubUrgentTabContent', () => {
    it('لا يرسم قائمة فارغة', () => {
        const { container } = render(
            <HomeHubUrgentTabContent
                split={splitHomeHubUrgentOverflow([], [])}
                sourceById={new Map()}
                onOpenEntity={vi.fn()}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('يعرض معاينة الرادار والتنبيه مع مصدر', () => {
        render(
            <HomeHubUrgentTabContent
                split={splitHomeHubUrgentOverflow([radar], [smart])}
                sourceById={new Map([[smart.id, source]])}
                onOpenEntity={vi.fn()}
                onNavigate={vi.fn()}
                onTogglePin={vi.fn()}
                isPinned={() => false}
            />,
        );
        expect(screen.getByTestId('home-hub-urgent-feed')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-radar-item-ev-tab')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-alert-row-alert-tab')).toBeInTheDocument();
    });
});
