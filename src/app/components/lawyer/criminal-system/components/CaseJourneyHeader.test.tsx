import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CaseJourneyHeader } from './CaseJourneyHeader';
import type { JourneyNode } from '@/app/types/criminal';

const journey: JourneyNode[] = [
    {
        id: '1',
        stage: 'investigation',
        label: 'مرحلة التحقيق',
        status: 'past',
        startedAt: '2026-01-01',
        endedAt: '2026-03-01',
        transitionText: 'بداية',
    },
    {
        id: '2',
        stage: 'misdemeanor',
        label: 'محكمة الجنح',
        status: 'current',
        startedAt: '2026-03-01',
        arrowLabel: 'قرار إحالة (محكمة الجنح)',
        transitionKind: 'forward_referral',
    },
];

describe('CaseJourneyHeader', () => {
    it('renders all passed stages without truncation and keeps only current active', () => {
        const longJourney: JourneyNode[] = [
            { id: '1', stage: 'investigation', label: 'مرحلة التحقيق', status: 'past', startedAt: '2026-01-01' },
            { id: '2', stage: 'misdemeanor', label: 'محكمة الجنح', status: 'past', startedAt: '2026-02-01' },
            { id: '3', stage: 'felony', label: 'محكمة الجنايات', status: 'past', startedAt: '2026-03-01' },
            { id: '4', stage: 'cassation', label: 'التمييز', status: 'active', startedAt: '2026-04-01' } as JourneyNode,
        ];
        render(
            <CaseJourneyHeader journey={longJourney} defendants={[]} selectedNodeId="" onSelectNode={vi.fn()} />,
        );
        expect(screen.getByText('مرحلة التحقيق')).toBeTruthy();
        expect(screen.getByText('محكمة الجنح')).toBeTruthy();
        expect(screen.getByText('محكمة الجنايات')).toBeTruthy();
        expect(screen.getByText('التمييز')).toBeTruthy();
    });

    it('renders capsules and legal connector text without arrow glyph', () => {
        const onSelectNode = vi.fn();
        const { container } = render(
            <CaseJourneyHeader
                journey={journey}
                defendants={[]}
                selectedNodeId=""
                onSelectNode={onSelectNode}
            />,
        );
        expect(screen.getByText('مرحلة التحقيق')).toBeTruthy();
        expect(screen.getByText('محكمة الجنح')).toBeTruthy();
        expect(screen.getByText('قرار إحالة (محكمة الجنح)')).toBeTruthy();
        expect(container.textContent).not.toContain('←');
    });

    it('shows referral button when trial phase flag is set', () => {
        render(
            <CaseJourneyHeader
                journey={journey}
                defendants={[]}
                selectedNodeId=""
                onSelectNode={vi.fn()}
                showReferralButton
                onOpenReferral={vi.fn()}
            />,
        );
        expect(screen.getByRole('button', { name: /إحالة/ })).toBeTruthy();
    });

    it('preserves dossier append order when investigation dates are out of sequence', () => {
        const loopJourney: JourneyNode[] = [
            {
                id: '1',
                stage: 'investigation',
                label: 'مرحلة التحقيق',
                status: 'past',
                startedAt: '2026-05-01',
            },
            {
                id: '2',
                stage: 'investigation',
                label: 'مرحلة التحقيق (2)',
                status: 'past',
                startedAt: '2026-01-01',
                transitionText: 'إعادة للتحقيق لوجود نقص',
                transitionKind: 'backward_reversal',
            },
            {
                id: '3',
                stage: 'misdemeanor',
                label: 'محكمة الجنح',
                status: 'current',
                startedAt: '2026-03-01',
                transitionText: 'قرار إحالة (محكمة الجنح)',
            },
        ];
        const { container } = render(
            <CaseJourneyHeader journey={loopJourney} defendants={[]} selectedNodeId="" onSelectNode={vi.fn()} />,
        );
        const html = container.innerHTML;
        const firstInv = html.indexOf('>مرحلة التحقيق</span>');
        const secondInv = html.indexOf('>مرحلة التحقيق (2)</span>');
        const misd = html.indexOf('>محكمة الجنح</');
        expect(firstInv).toBeGreaterThanOrEqual(0);
        expect(firstInv).toBeLessThan(secondInv);
        expect(secondInv).toBeLessThan(misd);
    });

    it('only current node is interactive in the journey strip', () => {
        const onSelectNode = vi.fn();
        render(
            <CaseJourneyHeader
                journey={journey}
                defendants={[]}
                selectedNodeId=""
                onSelectNode={onSelectNode}
            />,
        );
        expect(screen.queryByRole('button', { name: /مرحلة التحقيق/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /محكمة الجنح/ }));
        expect(onSelectNode).toHaveBeenCalledWith('');
    });
});
