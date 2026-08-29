import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ExecutionHero, RouteTile, DockHalfTile } from '@/app/components/lawyer/dashboard/commandHub';

const prefetchHubArchiveIntent = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch', () => ({
    prefetchHubArchiveIntent: (...args: unknown[]) => prefetchHubArchiveIntent(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate', () => ({
    prefetchHubArchiveIntentDebounced: (archiveId: string) => prefetchHubArchiveIntent(archiveId, 'hover'),
    prefetchHubArchiveIntentImmediate: (archiveId: string) => prefetchHubArchiveIntent(archiveId, 'open'),
}));

const dispatchTransactionsPrimeHost = vi.fn();
vi.mock('@/app/runtime/transactionsBootHydrator', () => ({
    dispatchTransactionsPrimeHost: (...args: unknown[]) => dispatchTransactionsPrimeHost(...args),
}));

vi.mock('@/app/runtime/executionArchivePrimeHost', () => ({
    dispatchExecutionArchivePrimeHost: vi.fn(),
}));

vi.mock('@/app/context/LawyerSettingsContext', () => ({
    useLawyerSettings: () => ({
        settings: {
            appearance: {
                glassOpacity: 0.92,
                homeContainerBorder: true,
            },
            performance: {
                litePerformance: true,
            },
        },
    }),
    useLawyerSettingsAppearance: () => ({
        glassOpacity: 0.92,
        homeContainerBorder: true,
    }),
}));

vi.mock('@/app/components/lawyer/dashboard/HomeBlockPatternOverlay', () => ({
    HomeBlockPatternOverlay: () => null,
}));

describe('ExecutionHero', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('نصف بلاطة التنفيذ بلا أيقونة في الشبكة', () => {
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={vi.fn()}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        expect(tile).toHaveAttribute('data-hami-layout-span', '1');
        expect(tile.querySelector('.hami-hub-hero-icon')).toBeNull();
        expect(tile.querySelector('.hami-hub-tile-face')).not.toBeNull();
        expect(tile.querySelector('.hami-hub-title-mark')).not.toBeNull();
        expect(tile.textContent).toContain('تنفيذ');
    });

    it('يعرض بطاقة التنفيذ وتستدعي prefetch عند hover', async () => {
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={vi.fn()}
                reduceMotion
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        expect(tile).toHaveAttribute('data-hami-block', 'hubExecution');
        expect(tile).toHaveAttribute('aria-label', 'تنفيذ — فتح مخزن الإضابير التنفيذية');

        fireEvent.pointerEnter(tile);
        await waitFor(() => {
            expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('execution', 'hover');
        });
        fireEvent.pointerDown(tile, { button: 0, clientX: 10, clientY: 10, pointerId: 1 });
        expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('execution', 'open');
    });

    it('يفتح مخزن التنفيذ عند النقر', () => {
        const onOpenArchive = vi.fn();
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        fireEvent.click(screen.getByTestId('hub-archive-execution'));
        expect(onOpenArchive).toHaveBeenCalledWith('execution');
    });

    it('لا يفتح التنفيذ عند تمرير الإصبع (scroll slop)', () => {
        const onOpenArchive = vi.fn();
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        fireEvent.pointerDown(tile, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(tile, { clientX: 130, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(tile, { button: 0, clientX: 130, clientY: 130, pointerId: 1 });
        expect(onOpenArchive).not.toHaveBeenCalled();
    });

    it('يعطّل التفاعل في وضع تخصيص التخطيط', () => {
        const onOpenArchive = vi.fn();
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={onOpenArchive}
                reduceMotion
                interactionDisabled
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        expect(tile).toBeDisabled();
        fireEvent.pointerEnter(tile);
        expect(prefetchHubArchiveIntent).not.toHaveBeenCalled();
        fireEvent.click(tile);
        expect(onOpenArchive).not.toHaveBeenCalled();
    });
});

describe('RouteTile — معاملات', () => {
    const transactionCard = {
        id: 'transaction' as const,
        tileId: 'hubTransaction' as const,
        label: 'معاملات',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض بطاقة المعاملات وتستدعي prefetch عند hover وتفتح على النقر فقط', async () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        const tile = screen.getByTestId('hub-archive-transaction');
        expect(tile).toHaveAttribute('data-hami-block', 'hubTransaction');
        expect(tile).toHaveAttribute('aria-label', 'معاملات — فتح الأرشيف');
        expect(tile.className).toContain('min-h-[5rem]');
        expect(tile.querySelector('[data-hami-hub-face="1"]')).not.toBeNull();
        expect(tile.querySelector('.hami-hub-tile-body')).toBeNull();

        fireEvent.pointerEnter(tile);
        await waitFor(() => {
            expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('transaction', 'hover');
        });

        fireEvent.pointerDown(tile, { button: 0, clientX: 100, clientY: 100 });
        expect(onOpenArchive).not.toHaveBeenCalled();

        fireEvent.pointerUp(tile, { button: 0, clientX: 100, clientY: 100 });
        expect(onOpenArchive).toHaveBeenCalledWith('transaction');
        await waitFor(() => {
            expect(dispatchTransactionsPrimeHost).toHaveBeenCalled();
        });
    });

    it('لا يفتح المعاملات عند تمرير الإصبع (scroll slop)', () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        const tile = screen.getByTestId('hub-archive-transaction');
        fireEvent.pointerDown(tile, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(tile, { clientX: 130, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(tile, { button: 0, clientX: 130, clientY: 130, pointerId: 1 });
        expect(onOpenArchive).not.toHaveBeenCalled();
    });

    it('يفتح مخزن المعاملات عند النقر (fallback إن لم يُفتح pointerdown)', () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        fireEvent.click(screen.getByTestId('hub-archive-transaction'));
        expect(onOpenArchive).toHaveBeenCalledWith('transaction');
    });

    it('يعطّل التفاعل في وضع تخصيص التخطيط', () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
                interactionDisabled
            />,
        );

        const tile = screen.getByTestId('hub-archive-transaction');
        expect(tile).toBeDisabled();
        fireEvent.pointerEnter(tile);
        expect(prefetchHubArchiveIntent).not.toHaveBeenCalled();
        fireEvent.click(tile);
        expect(onOpenArchive).not.toHaveBeenCalled();
    });
});

describe('RouteTile — دعاوى', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح الدعاوى عند النقر', () => {
        const onOpenArchive = vi.fn();
        const lawsuitCard = {
            id: 'lawsuit' as const,
            tileId: 'hubLawsuit' as const,
            label: 'دعاوى',
        };
        render(
            <RouteTile
                card={lawsuitCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
            />,
        );

        fireEvent.click(screen.getByTestId('hub-archive-lawsuit'));
        expect(onOpenArchive).toHaveBeenCalledWith('lawsuit');
    });

    it('يسخّن الأرشيف عند التركيز لوحة المفاتيح', async () => {
        const lawsuitCard = {
            id: 'lawsuit' as const,
            tileId: 'hubLawsuit' as const,
            label: 'دعاوى',
        };
        render(
            <RouteTile
                card={lawsuitCard}
                onOpenArchive={vi.fn()}
                reduceMotion
            />,
        );

        fireEvent.focus(screen.getByTestId('hub-archive-lawsuit'));
        await waitFor(() => {
            expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('lawsuit', 'hover');
        });
    });
});

describe('DockHalfTile', () => {
    it('بلاطة التقويم بوجه واحد بلا أغلفة قديمة', () => {
        render(
            <DockHalfTile
                widgetId="dockCalendar"
                label="التقويم"
                onOpen={vi.fn()}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('home-dock-dockCalendar');
        expect(tile.className).toContain('min-h-[5rem]');
        expect(tile.querySelector('.hami-hub-tile-face')).not.toBeNull();
        expect(tile.querySelector('.hami-hub-tile-body')).toBeNull();
        expect(tile.querySelector('.hami-hub-tile--half')).toBeNull();
        expect(tile).toHaveTextContent('التقويم');
        const title = tile.querySelector('.hami-hub-title--half-fill') as HTMLElement | null;
        expect(title?.style.getPropertyValue('--hami-hub-title-size')).toBe('2.05rem');
    });

    it('لا يفتح التقويم عند تمرير الإصبع (scroll slop)', () => {
        const onOpen = vi.fn();
        render(
            <DockHalfTile
                widgetId="dockCalendar"
                label="التقويم"
                onOpen={onOpen}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('home-dock-dockCalendar');
        fireEvent.pointerDown(tile, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(tile, { clientX: 130, clientY: 130, pointerId: 1 });
        fireEvent.pointerUp(tile, { button: 0, clientX: 130, clientY: 130, pointerId: 1 });
        expect(onOpen).not.toHaveBeenCalled();
    });

    it('بلاطة المستودع بنفس الوجه الهادئ', () => {
        render(
            <DockHalfTile
                widgetId="dockVault"
                label="المستودع"
                onOpen={vi.fn()}
                reduceMotion
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('home-dock-dockVault');
        expect(tile.className).toContain('min-h-[5rem]');
        expect(tile.querySelector('[data-hami-hub-face="1"]')).not.toBeNull();
        expect(tile.querySelector('.hami-hub-tile-body')).toBeNull();
        expect(tile).toHaveTextContent('المستودع');
    });
});
