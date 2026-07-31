import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/hooks/useEntityCalendarEvents', () => ({
    useEntityCalendarEvents: () => [],
}));

vi.mock('@/app/hooks/useReduceMotion', () => ({
    useReduceMotion: () => true,
}));

vi.mock('../ExecutionTimelineFilterBar', () => ({
    ExecutionTimelineFilterBar: () => <div>filter bar</div>,
}));

import { TimelineSection } from '../TimelineSection';

function IconStub() {
    return <span aria-hidden="true" />;
}

function createBaseProps(
    overrides: Partial<React.ComponentProps<typeof TimelineSection>> = {},
): React.ComponentProps<typeof TimelineSection> {
    return {
        timelineAccordionExpanded: true,
        setTimelineAccordionExpanded: vi.fn(),
        startTransition: (cb: () => void) => cb(),
        ChevronUp: IconStub,
        Activity: IconStub,
        History: IconStub,
        debtorBrowserTabsMode: false,
        activeTimelineEventsDebtorScoped: [],
        activeTimelineEvents: [],
        EXEC_OVERLAY_LAZY_FALLBACK: <div>loading</div>,
        SmartTimelineRadar: ({ onOpenFull }: { onOpenFull: () => void }) => (
            <button type="button" onClick={onOpenFull}>
                open timeline from radar
            </button>
        ),
        toggleTimelineEventPin: vi.fn(),
        onOpenTimelineModal: vi.fn(),
        timelineRadarPreviewLimit: 5,
        isHistoricalMode: false,
        activeTimelineFilter: 'الكل',
        setActiveTimelineFilter: vi.fn(),
        todayYmd: '2026-07-10',
        PremiumTimelineAuditLog: () => <div>audit log</div>,
        moveTimelineEventToTrash: vi.fn(),
        onRequestEditTimelineEvent: vi.fn(),
        timelineFilterOptions: ['الكل', 'مواعيد'],
        ...overrides,
    };
}

describe('TimelineSection', () => {
    it('opens the full timeline through the explicit callback from expanded body', () => {
        const onOpenTimelineModal = vi.fn();

        render(<TimelineSection {...createBaseProps({ onOpenTimelineModal })} />);

        fireEvent.click(screen.getByRole('button', { name: 'عرض السجل الكامل' }));

        expect(onOpenTimelineModal).toHaveBeenCalledTimes(1);
    });

    it('opens the full timeline through the explicit callback from radar', () => {
        const onOpenTimelineModal = vi.fn();

        render(
            <TimelineSection
                {...createBaseProps({
                    timelineAccordionExpanded: false,
                    activeTimelineEvents: [
                        {
                            id: 't-1',
                            title: 'حدث',
                            type: 'note',
                            date: '2026-07-10',
                        },
                    ],
                    onOpenTimelineModal,
                })}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'open timeline from radar' }));

        expect(onOpenTimelineModal).toHaveBeenCalledTimes(1);
    });
});
