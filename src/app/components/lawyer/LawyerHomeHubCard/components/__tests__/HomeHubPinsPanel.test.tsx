import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ClusterPinView } from '@/app/workspace/types';
import { HomeHubPinsPanel } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsPanel';

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: () => 0,
}));

function samplePin(id: string): ClusterPinView {
    return {
        pin: {
            id,
            type: 'task',
            title: `مهمة ${id}`,
            clientName: 'عميل',
            caseNumber: '123/2024',
            routePath: `workspace:task:${id}`,
        },
        related: [],
    };
}

describe('HomeHubPinsPanel', () => {
    it('يتكيّف مع عنصر واحد بلا ارتفاع زائد', () => {
        render(
            <HomeHubPinsPanel
                clusterViews={[samplePin('1')]}
                onNavigate={vi.fn()}
                onUnpin={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-pins-stack')).toBeInTheDocument();
        expect(screen.queryByTestId('home-hub-pins-more-trigger')).not.toBeInTheDocument();
    });

    it('يعرض البقية عند تجاوز 3 عناصر', () => {
        const views = ['1', '2', '3', '4', '5'].map(samplePin);
        render(
            <HomeHubPinsPanel clusterViews={views} onNavigate={vi.fn()} onUnpin={vi.fn()} />,
        );

        expect(screen.getByTestId('home-hub-pins-preview')).toBeInTheDocument();
        expect(screen.getByTestId('home-hub-pins-more-trigger')).toBeInTheDocument();
        expect(screen.getByText(/البقية \(2\)/)).toBeInTheDocument();
    });

    it('يفتح ستارة بكل العناصر', () => {
        const views = ['1', '2', '3', '4'].map(samplePin);
        render(
            <HomeHubPinsPanel clusterViews={views} onNavigate={vi.fn()} onUnpin={vi.fn()} />,
        );

        fireEvent.pointerDown(screen.getByTestId('home-hub-pins-more-trigger'), {
            button: 0,
            clientX: 10,
            clientY: 10,
            pointerId: 1,
        });
        fireEvent.pointerUp(screen.getByTestId('home-hub-pins-more-trigger'), {
            button: 0,
            clientX: 10,
            clientY: 10,
            pointerId: 1,
        });

        expect(screen.getByTestId('home-hub-pins-more-overlay')).toBeInTheDocument();
    });
});
