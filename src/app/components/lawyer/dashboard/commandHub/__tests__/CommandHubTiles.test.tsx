import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FileText } from 'lucide-react';
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

    it('يعرض بطاقة المعاملات وتستدعي prefetch عند hover وتفتح على pointerdown', () => {
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

        fireEvent.pointerDown(tile, { button: 0 });
        expect(onOpenArchive).toHaveBeenCalledWith('transaction');
        expect(dispatchTransactionsPrimeHost).toHaveBeenCalled();
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
