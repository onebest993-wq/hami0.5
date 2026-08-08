import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomeHubSecretaryInsightCard } from '@/app/components/lawyer/LawyerHomeHubCard/components/HomeHubSecretaryInsightCard';
import type { SparkNudge } from '@/app/spark/types';

const sampleNudge: SparkNudge = {
    id: 'sec-1',
    kind: 'calendar.unscheduled_dossier_date',
    surface: 'calendar',
    priority: 6,
    message: 'موعد غير مجدول في تنفيذ — 06/08/2026 — هل تود مراجعته؟',
    presence: {
        present: [],
        missing: ['موعد في التقويم'],
    },
    source: 'test',
    targetFileId: 'exec-1',
    action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
};

describe('HomeHubSecretaryInsightCard', () => {
    it('يعرض بطاقة سكرتير زجاجية خفيفة مع إجراءات', () => {
        const onOpen = vi.fn();
        render(
            <HomeHubSecretaryInsightCard
                nudge={sampleNudge}
                summaryKind={sampleNudge.kind}
                preferenceScope="home-hub-calendar"
                onOpenTarget={onOpen}
            />,
        );

        expect(screen.getByTestId('home-hub-secretary-item-sec-1')).toBeInTheDocument();
        expect(screen.queryByTestId('spark-smart-badge')).not.toBeInTheDocument();
        expect(screen.getByText(/تنفيذ/)).toBeInTheDocument();
        expect(screen.getByText(/06\/08\/2026/)).toBeInTheDocument();
        expect(screen.queryByText(/موجود:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/غير مسجّل:/)).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'فتح الإضبارة' }));
        expect(onOpen).toHaveBeenCalledWith('exec-1');
    });
});
