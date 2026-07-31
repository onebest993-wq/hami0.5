import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
    ThirdPartySeizureRegistryCard,
    ThirdPartySeizureWorkflowCard,
} from '@/app/components/lawyer/execution/ThirdPartySeizureLogCards';
import type { ThirdPartySeizure, ThirdPartySeizureAsset, TimelineEvent } from '@/app/types/execution';

describe('ThirdPartySeizureLogCards', () => {
    it('acknowledges a third-party seizure reply and records timeline merge', () => {
        const onSeizuresChange = vi.fn();
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn(
            (updater: React.SetStateAction<TimelineEvent[]>) =>
                typeof updater === 'function' ? updater([]) : updater,
        ) as React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
        const showToast = vi.fn();

        render(
            <ThirdPartySeizureWorkflowCard
                seizure={
                    {
                        id: 'tp-1',
                        thirdPartyName: 'مصرف الرافدين',
                        status: 'notified',
                        replyStatus: '',
                    } as unknown as ThirdPartySeizure
                }
                fundsDraft=""
                onFundsDraftChange={vi.fn()}
                onSeizuresChange={onSeizuresChange}
                seizures={[
                    {
                        id: 'tp-1',
                        thirdPartyName: 'مصرف الرافدين',
                        status: 'notified',
                        replyStatus: '',
                    } as unknown as ThirdPartySeizure,
                ]}
                persistExecutionMerge={persistExecutionMerge}
                setTimelineEvents={setTimelineEvents}
                nextTimelineId={() => 'timeline-1'}
                showToast={showToast}
                onCreditToFinancialCenter={vi.fn(() => ({ ok: true }))}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'إقرار بوجود رصيد' }));

        expect(onSeizuresChange).toHaveBeenCalledWith([
            expect.objectContaining({
                id: 'tp-1',
                status: 'replied',
                replyStatus: 'acknowledged',
            }),
        ]);
        expect(setTimelineEvents).toHaveBeenCalledTimes(1);
        expect(showToast).toHaveBeenCalledWith('تم الإقرار بوجود رصيد.', 'success');
    });

    it('shows placeholder guidance for incomplete registry assets', () => {
        render(
            <ThirdPartySeizureRegistryCard
                asset={
                    {
                        id: 'asset-1',
                        thirdPartyName: 'بانتظار الإكمال',
                        status: 'waiting',
                    } as ThirdPartySeizureAsset
                }
                beginReceive={vi.fn()}
                updateReceiveDraft={vi.fn()}
                cancelReceive={vi.fn()}
                confirmReceive={vi.fn()}
            />,
        );

        expect(
            screen.getByText(/أكمل بيانات الحجز لدى الغير من تبويب طلبات الحجز لبدء المتابعة/i),
        ).toBeInTheDocument();
    });
});
