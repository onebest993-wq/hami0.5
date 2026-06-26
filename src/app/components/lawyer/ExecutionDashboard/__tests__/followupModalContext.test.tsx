import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { FollowupModalStoreProvider, useFollowupModal } from '../followupModalContext';

function SnapshotProbe({ labelKey }: { labelKey: string }) {
    const snapshot = useFollowupModal();
    return <span data-testid="probe">{String(snapshot[labelKey] ?? 'missing')}</span>;
}

describe('FollowupModalStoreProvider', () => {
    it('notifies portal when snapshot handlers arrive after first render', () => {
        function Host() {
            const [ready, setReady] = useState(false);
            const snapshot = ready
                ? { handleCoerciveAction: 'wired' }
                : ({} as Record<string, unknown>);

            return (
                <>
                    <button type="button" onClick={() => setReady(true)}>
                        wire
                    </button>
                    <FollowupModalStoreProvider snapshot={snapshot}>
                        <SnapshotProbe labelKey="handleCoerciveAction" />
                    </FollowupModalStoreProvider>
                </>
            );
        }

        render(<Host />);
        expect(screen.getByTestId('probe')).toHaveTextContent('missing');
        act(() => {
            screen.getByRole('button', { name: 'wire' }).click();
        });
        expect(screen.getByTestId('probe')).toHaveTextContent('wired');
    });
});
