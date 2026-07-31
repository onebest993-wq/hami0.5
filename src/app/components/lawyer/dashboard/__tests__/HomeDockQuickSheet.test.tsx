import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeDockQuickSheet } from '@/app/components/lawyer/dashboard/HomeDockQuickSheet';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { WorkspacePinnedItem } from '@/app/workspace/types';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const alert = (overrides: Partial<SecretaryAlert> = {}): SecretaryAlert =>
    ({
        id: 'a1',
        title: 'موعد جلسة',
        summary: 'غداً',
        dueAt: new Date(Date.now() + 3600_000).toISOString(),
        severity: 'critical',
        ...overrides,
    }) as SecretaryAlert;

const pin = (overrides: Partial<WorkspacePinnedItem> = {}): WorkspacePinnedItem =>
    ({
        id: 'p1',
        type: 'lawsuit',
        title: 'دعوى تجريبية',
        clientName: 'أحمد',
        caseNumber: '12/2026',
        routePath: 'workspace:lawsuit:p1',
        ...overrides,
    }) as WorkspacePinnedItem;

describe('HomeDockQuickSheet', () => {
    it('يعرض تبويبات بدور tab وحد أدنى 44px للإغلاق والتبويب', () => {
        render(
            <HomeDockQuickSheet
                mode="alerts"
                onClose={vi.fn()}
                secretaryAlerts={[alert()]}
                pinnedItems={[pin()]}
                onNavigateRoute={vi.fn()}
                onOpenEntity={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        const closeBtn = screen.getByLabelText('إغلاق المركز السريع');
        expect(closeBtn.className).toMatch(/min-h-\[44px]/);
        expect(closeBtn.className).toMatch(/min-w-\[44px]/);

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(2);
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
        for (const tab of tabs) {
            expect(tab.className).toMatch(/min-h-\[44px]/);
        }
    });

    it('ينقل مسار التثبيت عند النقر ويُغلق الورقة', () => {
        const onNavigateRoute = vi.fn();
        const onClose = vi.fn();
        render(
            <HomeDockQuickSheet
                mode="pins"
                onClose={onClose}
                secretaryAlerts={[]}
                pinnedItems={[pin({ routePath: 'workspace:lawsuit:abc' })]}
                onNavigateRoute={onNavigateRoute}
                onOpenEntity={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByText('دعوى تجريبية'));
        expect(onNavigateRoute).toHaveBeenCalledWith('workspace:lawsuit:abc');
        expect(onClose).toHaveBeenCalled();
    });

    it('يوفّر منطقة لمس 44px لإلغاء التثبيت', () => {
        render(
            <HomeDockQuickSheet
                mode="pins"
                onClose={vi.fn()}
                secretaryAlerts={[]}
                pinnedItems={[pin({ title: 'قضية أ' })]}
                onNavigateRoute={vi.fn()}
                onOpenEntity={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        const unpin = screen.getByRole('button', { name: /إلغاء تثبيت/ });
        expect(unpin.className).toMatch(/min-h-\[44px]/);
        expect(unpin.className).toMatch(/min-w-\[44px]/);
    });
});
