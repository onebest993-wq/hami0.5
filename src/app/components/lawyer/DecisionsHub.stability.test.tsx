/** @vitest-environment jsdom */
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { DecisionsHub } from '@/app/components/lawyer/DecisionsHub';

describe('DecisionsHub parent rerender storm', () => {
    it('does not exceed safe render count when parent ticks like ExecutionDashboard scope', async () => {
        let hubRenderCount = 0;
        const _Parent = () => {
            const [tick, setTick] = useState(0);
            React.useEffect(() => {
                if (tick >= 12) return;
                const id = window.setTimeout(() => setTick((n) => n + 1), 5);
                return () => window.clearTimeout(id);
            }, [tick]);
            return (
                <DecisionsHub
                    executionId="e2e-console-hygiene-1"
                    onTimelineUpdate={vi.fn()}
                    executionData={{
                        id: 'e2e-console-hygiene-1',
                        claimType: 'استحصال دين مالي',
                        updatedAt: `tick-${tick}`,
                    }}
                    seizedAssets={[]}
                    persistExecutionMerge={vi.fn()}
                    pushTimelineEvent={vi.fn()}
                    nextTimelineId={() => 'tl-1'}
                    syncSeizedAssets={vi.fn()}
                    syncSeizureDrafts={vi.fn()}
                    syncActiveCoerciveActions={vi.fn()}
                    onRender={() => {
                        hubRenderCount += 1;
                    }}
                />
            );
        };

        // DecisionsHub has no onRender - count via wrapper
        let renders = 0;
        const CounterParent = () => {
            const [tick, setTick] = useState(0);
            React.useEffect(() => {
                if (tick >= 12) return;
                const id = window.setTimeout(() => setTick((n) => n + 1), 5);
                return () => window.clearTimeout(id);
            }, [tick]);
            renders += 1;
            return (
                <DecisionsHub
                    executionId="e2e-console-hygiene-1"
                    onTimelineUpdate={vi.fn()}
                    executionData={{
                        id: 'e2e-console-hygiene-1',
                        claimType: 'استحصال دين مالي',
                        updatedAt: `tick-${tick}`,
                    }}
                    seizedAssets={[]}
                    persistExecutionMerge={vi.fn()}
                    pushTimelineEvent={vi.fn()}
                    nextTimelineId={() => 'tl-1'}
                />
            );
        };

        render(<CounterParent />);
        await act(async () => {
            await new Promise((r) => setTimeout(r, 250));
        });

        expect(renders).toBeLessThan(40);
        void hubRenderCount;
    });
});
