import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FileText } from '@/app/components/ui/lucideIcons';
import { ExecutionHero, RouteTile } from '@/app/components/lawyer/dashboard/commandHub/CommandHubTiles';

const prefetchHubArchiveIntent = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch', () => ({
    prefetchHubArchiveIntent: (...args: unknown[]) => prefetchHubArchiveIntent(...args),
}));

vi.mock('@/app/hooks/lawyerDashboard/hubArchivePrefetchGate', () => ({
    prefetchHubArchiveIntentDebounced: (archiveId: string) => prefetchHubArchiveIntent(archiveId, 'hover'),
}));

const dispatchTransactionsPrimeHost = vi.fn();
vi.mock('@/app/runtime/transactionsBootHydrator', () => ({
    dispatchTransactionsPrimeHost: (...args: unknown[]) => dispatchTransactionsPrimeHost(...args),
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

vi.mock('@/app/components/lawyer/dashboard/HomeMoroccanGlassDecor', () => ({
    HomeMoroccanGlassDecor: () => null,
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
                themePrimary="#E6C673"
                layoutSpan={1}
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        expect(tile).toHaveAttribute('data-hami-layout-span', '1');
        expect(tile.querySelector('.hami-hub-hero-icon')).toBeNull();
        expect(tile.textContent).toContain('تنفيذ');
    });

    it('يعرض بطاقة التنفيذ وتستدعي prefetch عند hover', () => {
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={vi.fn()}
                reduceMotion
                themePrimary="#E6C673"
            />,
        );

        const tile = screen.getByTestId('hub-archive-execution');
        expect(tile).toHaveAttribute('data-hami-block', 'hubExecution');
        expect(tile).toHaveAttribute('aria-label', 'تنفيذ — فتح مخزن الإضابير التنفيذية');

        fireEvent.pointerEnter(tile);
        expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('execution', 'hover');
    });

    it('يُضيف عدّاد سبارك إلى aria-label دون تغيير الشكل', () => {
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={vi.fn()}
                reduceMotion
                themePrimary="#E6C673"
                proceduralAttentionCount={2}
            />,
        );

        expect(screen.getByTestId('hub-archive-execution')).toHaveAttribute(
            'aria-label',
            'تنفيذ — 2 متابعات إجرائية — فتح مخزن الإضابير التنفيذية',
        );
        expect(screen.getByTestId('hub-spark-attention-badge')).toHaveTextContent('2');
    });

    it('يفتح مخزن التنفيذ عند النقر', () => {
        const onOpenArchive = vi.fn();
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={onOpenArchive}
                reduceMotion
                themePrimary="#E6C673"
            />,
        );

        fireEvent.click(screen.getByTestId('hub-archive-execution'));
        expect(onOpenArchive).toHaveBeenCalledWith('execution');
    });

    it('يعطّل التفاعل في وضع تخصيص التخطيط', () => {
        const onOpenArchive = vi.fn();
        render(
            <ExecutionHero
                accent="#E6C673"
                onOpenArchive={onOpenArchive}
                reduceMotion
                themePrimary="#E6C673"
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
        icon: FileText,
        accent: '#7EC8E3',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض بطاقة المعاملات وتستدعي prefetch عند hover وتفتح على النقر فقط', () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
                themePrimary="#E6C673"
            />,
        );

        const tile = screen.getByTestId('hub-archive-transaction');
        expect(tile).toHaveAttribute('data-hami-block', 'hubTransaction');
        expect(tile).toHaveAttribute('aria-label', 'معاملات — فتح الأرشيف');

        fireEvent.pointerEnter(tile);
        expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('transaction', 'hover');

        fireEvent.pointerDown(tile, { button: 0, clientX: 100, clientY: 100 });
        expect(onOpenArchive).not.toHaveBeenCalled();

        fireEvent.pointerUp(tile, { button: 0, clientX: 100, clientY: 100 });
        expect(onOpenArchive).toHaveBeenCalledWith('transaction');
        expect(dispatchTransactionsPrimeHost).toHaveBeenCalled();
    });

    it('لا يفتح المعاملات عند تمرير الإصبع (scroll slop)', () => {
        const onOpenArchive = vi.fn();
        render(
            <RouteTile
                card={transactionCard}
                onOpenArchive={onOpenArchive}
                reduceMotion
                themePrimary="#E6C673"
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
                themePrimary="#E6C673"
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
                themePrimary="#E6C673"
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
