import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { SparkNudge } from '@/app/spark/types';
import { HomeHubSecretaryPanel } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubSecretaryPanel';

vi.mock('@/app/hooks/useMobileKeyboardInset', () => ({
    useMobileKeyboardInset: () => 0,
}));

vi.mock('@/app/services/alerts/homeHubSparkInsightBridge', () => ({
    resolveHomeHubSparkInsights: vi.fn(),
    listHomeHubSparkInsightsForSecretaryPanel: vi.fn(),
}));

vi.mock('@/app/spark/engine/homeSparkAggregateScan', () => ({
    scanHomeSparkHits: vi.fn(() => []),
}));

import {
    listHomeHubSparkInsightsForSecretaryPanel,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';

function sampleNudge(id: string): SparkNudge {
    return {
        id,
        kind: 'home.procedural_attention_summary',
        surface: 'home',
        priority: 4,
        message: `يبدو أن تنفيذ ${id} تحتاج غير مبلّغ — هل يهمك الأمر؟`,
        presence: { present: [], missing: [] },
        source: 'test',
        targetFileId: id,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}

describe('HomeHubSecretaryPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعرض سهم الباقي عند تجاوز 3 توصيات', () => {
        const nudges = ['n1', 'n2', 'n3', 'n4', 'n5'].map(sampleNudge);
        vi.mocked(resolveHomeHubSparkInsights).mockReturnValue({
            calendar: null,
            homeNudges: nudges.slice(1),
        });
        vi.mocked(listHomeHubSparkInsightsForSecretaryPanel).mockReturnValue(nudges);

        render(
            <HomeHubSecretaryPanel
                clusterScanSources={{ ready: true } as never}
                onNavigate={vi.fn()}
            />,
        );

        expect(screen.getByTestId('home-hub-secretary-preview')).toBeInTheDocument();
        expect(screen.getAllByRole('article')).toHaveLength(3);
        expect(screen.getByTestId('home-hub-secretary-more-trigger')).toBeInTheDocument();
        expect(screen.getByText(/البقية \(2\)/)).toBeInTheDocument();
    });

    it('يفتح حاوية مستقلة بكل التوصيات', () => {
        const nudges = ['n1', 'n2', 'n3', 'n4'].map(sampleNudge);
        vi.mocked(listHomeHubSparkInsightsForSecretaryPanel).mockReturnValue(nudges);

        render(
            <HomeHubSecretaryPanel
                clusterScanSources={{ ready: true } as never}
                onNavigate={vi.fn()}
            />,
        );

        fireEvent.pointerDown(screen.getByTestId('home-hub-secretary-more-trigger'), {
            button: 0,
            clientX: 10,
            clientY: 10,
            pointerId: 1,
        });
        fireEvent.pointerUp(screen.getByTestId('home-hub-secretary-more-trigger'), {
            button: 0,
            clientX: 10,
            clientY: 10,
            pointerId: 1,
        });
        const overlay = screen.getByTestId('home-hub-secretary-more-overlay');
        expect(overlay).toBeInTheDocument();
        expect(overlay.querySelectorAll('article')).toHaveLength(4);
    });
});
