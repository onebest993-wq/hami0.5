/** @vitest-environment jsdom */
import React, { useCallback, useMemo, useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, act } from '@testing-library/react';
import { DecisionsAndAppealsEngine } from '@/app/components/lawyer/DecisionsAndAppealsEngine';

function executionDataHubFingerprint(data: Record<string, unknown> | null): string {
    if (!data) return '';
    return [
        String(data.id ?? ''),
        String(data.parentDossierId ?? data.parentFileId ?? ''),
        String(data.claimType ?? ''),
        String(data.directorate ?? ''),
    ].join('|');
}

function DecisionsEngineHarness({
    executionId = 'e2e-console-hygiene-1',
    tick = 0,
}: {
    executionId?: string;
    tick?: number;
}) {
    const persistExecutionMerge = useCallback(() => {}, []);
    const pushTimeline = useCallback(() => {}, []);
    const nextTimelineId = useCallback(() => 'tl-1', []);
    const executionData = useMemo(
        () => ({
            id: executionId,
            fileNumber: '101',
            directorate: 'مديرية تنفيذ E2E',
            claimType: 'استحصال دين مالي',
            debtors: [{ id: 'd1', name: 'مدين E2E' }],
            updatedAt: `tick-${tick}`,
        }),
        [executionId, tick],
    );
    const executionDataFingerprint = executionDataHubFingerprint(executionData);
    const dispatcherHub = useMemo(
        () => ({
            executionData,
            seizedAssets: [],
            persistExecutionMerge,
            pushTimeline,
            nextTimelineId,
        }),
        [
            executionDataFingerprint,
            executionData,
            persistExecutionMerge,
            pushTimeline,
            nextTimelineId,
        ],
    );

    return (
        <DecisionsAndAppealsEngine
            executionId={executionId}
            onTimelineUpdate={() => {}}
            dispatcherHub={dispatcherHub}
        />
    );
}

describe('DecisionsAndAppealsEngine integration stability', () => {
    it('does not exceed safe render count on mount (simulated dashboard props)', async () => {
        let renderCount = 0;
        const Probe = () => {
            renderCount += 1;
            return <DecisionsEngineHarness />;
        };

        render(<Probe />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 200));
        });

        expect(renderCount).toBeLessThan(40);
    });

    it('survives parent storage-tick re-renders without runaway updates', async () => {
        let renderCount = 0;
        const Parent = () => {
            const [tick, setTick] = React.useState(0);
            const bumps = useRef(0);
            React.useEffect(() => {
                if (bumps.current >= 5) return;
                bumps.current += 1;
                setTick((n) => n + 1);
            }, [tick]);
            renderCount += 1;
            return <DecisionsEngineHarness tick={tick} />;
        };

        render(<Parent />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 300));
        });

        expect(renderCount).toBeLessThan(60);
    });
});
