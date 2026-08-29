import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubAlertRow } from '../HomeHubAlertRow';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { SmartAlert } from '../../../NeuralAlertsCard/types';

const smart: SmartAlert = {
    id: 'alert-1',
    title: 'جلسة استئناف',
    description: '',
    priority: 'high',
    actionType: 'openChecklist',
    actionLabel: 'فتح',
    payload: {},
    timestamp: 1,
    timeLabel: 'غداً 10:00 ص',
    sectionLabel: 'دعوى',
    courtSubtitle: 'محكمة الكرخ',
};

const source = {
    id: 'lawsuit:case-9',
    title: 'جلسة استئناف',
    summary: '',
    dueAt: new Date().toISOString(),
    severity: 'high',
    target: 'lawsuit',
    entityId: 'case-9',
    clientName: 'أحمد',
} as SecretaryAlert;

describe('HomeHubAlertRow', () => {
    it('يفتح الكيان ويتجاهل ويثبّت مع تسميات العنوان', () => {
        const onNavigate = vi.fn();
        const onDismiss = vi.fn();
        const onTogglePin = vi.fn();
        render(
            <ul>
                <HomeHubAlertRow
                    alert={smart}
                    source={source}
                    onNavigate={onNavigate}
                    onDismiss={onDismiss}
                    onTogglePin={onTogglePin}
                    isPinned={() => false}
                />
            </ul>,
        );

        const row = screen.getByTestId('home-hub-alert-row-alert-1');
        expect(row.querySelector('.hami-hub-alert-row__title-text')?.textContent).toBe('جلسة استئناف');
        fireEvent.click(screen.getByRole('button', { name: 'جلسة استئناف — غداً 10:00 ص' }));
        expect(onNavigate).toHaveBeenCalledWith(source);

        fireEvent.click(screen.getByRole('button', { name: 'تثبيت جلسة استئناف في البطاقة العامة' }));
        expect(onTogglePin).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: 'تجاهل جلسة استئناف' }));
        expect(onDismiss).toHaveBeenCalledWith('alert-1');
    });

    it('يعرض إلغاء التثبيت عندما يكون العنصر مثبتاً', () => {
        render(
            <ul>
                <HomeHubAlertRow
                    alert={smart}
                    source={source}
                    onNavigate={vi.fn()}
                    onDismiss={vi.fn()}
                    onTogglePin={vi.fn()}
                    isPinned={() => true}
                />
            </ul>,
        );
        const pinBtn = screen.getByRole('button', { name: 'إلغاء تثبيت جلسة استئناف' });
        expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
    });
});
