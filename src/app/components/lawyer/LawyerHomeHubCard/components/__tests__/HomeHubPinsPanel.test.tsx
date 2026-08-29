import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ClusterAggregatorInput } from '@/app/workspace/useClusterAggregator';
import { HomeHubPinsPanel } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsPanel';

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: () => 0,
}));

function aggregatorFromIds(ids: string[]): ClusterAggregatorInput {
    return {
        pinnedItems: ids.map((id) => ({
            id,
            type: 'task' as const,
            title: `مهمة ${id}`,
            clientName: 'عميل',
            caseNumber: '123/2024',
            routePath: `workspace:task:${id}`,
        })),
        lawsuitFiles: [],
        executionFiles: [],
        criminalCases: [],
        urgentCases: [],
        threadingTransactions: [],
        notes: [],
        fieldTasks: [],
    };
}

describe('HomeHubPinsPanel', () => {
    it('يتكيّف مع عنصر واحد بلا ارتفاع زائد', () => {
        render(
            <HomeHubPinsPanel
                enabled
                aggregatorInput={aggregatorFromIds(['1'])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-pins-stack')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-pins-more-trigger')).not.toBeInTheDocument();
    });

    it('يعرض البقية عند تجاوز 3 عناصر', () => {
        render(
            <HomeHubPinsPanel
                enabled
                aggregatorInput={aggregatorFromIds(['1', '2', '3', '4', '5'])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-pins-preview')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-pins-more-trigger')).toBeInTheDocument();
        expect(screen.getByText(/البقية \(2\)/)).toBeInTheDocument();
    });

    it('يفتح ستارة بكل العناصر', async () => {
        render(
            <HomeHubPinsPanel
                enabled
                aggregatorInput={aggregatorFromIds(['1', '2', '3', '4'])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('home-hub-pins-more-trigger'));

        expect(
            await screen.findByTestId('home-hub-pins-more-overlay', {}, { timeout: 8_000 }),
        ).toBeInTheDocument();
    });

    it('لا يبني قائمة عند التعطيل', () => {
        render(
            <HomeHubPinsPanel
                enabled={false}
                aggregatorInput={aggregatorFromIds(['1', '2'])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-pins-empty')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-pins-stack')).not.toBeInTheDocument();
    });

    it('البطاقة المطوية تعيد نفس رسالة الفراغ في التثبيت', () => {
        render(
            <HomeHubPinsPanel
                enabled
                hubFullyEmpty
                aggregatorInput={aggregatorFromIds([])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        const empty = screen.getByTestId('home-hub-pins-empty');
        expect(empty).toHaveAttribute('role', 'status');
        expect(empty).toHaveTextContent('لا يوجد تنبيه أو تثبيت');
        expect(
            screen.queryByText('لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.'),
        ).not.toBeInTheDocument();
    });

    it('فراغ التثبيت مع وجود تنبيهات يبقى تعليمات التثبيت', () => {
        render(
            <HomeHubPinsPanel
                enabled
                aggregatorInput={aggregatorFromIds([])}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        const empty = screen.getByTestId('home-hub-pins-empty');
        expect(empty).toHaveAttribute('role', 'status');
        expect(empty).toHaveTextContent('لا عناصر مثبّتة — استخدم زر التثبيت على الإضبارات.');
    });
});
