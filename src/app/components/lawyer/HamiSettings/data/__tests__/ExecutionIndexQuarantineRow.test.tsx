import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

const hasQ = vi.fn(() => true);
const claimQ = vi.fn(() => true);

vi.mock('@/app/utils/executionFilesStorage', () => ({
    hasQuarantinedExecutionFilesIndex: () => hasQ(),
    claimQuarantinedExecutionFilesIndex: () => claimQ(),
}));

vi.mock('@/app/components/ui/SmartDialog', () => ({
    SmartDialog: { confirm: vi.fn(() => Promise.resolve(true)) },
}));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { success: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/app/services/settings/verifySensitiveSettingsAction', () => ({
    mintSensitiveConfirmChallenge: (base: string) => ({
        confirmPhrase: base,
        promptMessage: base,
    }),
    verifySensitiveSettingsAction: vi.fn(() => Promise.resolve(true)),
}));

import { ExecutionIndexQuarantineRow } from '@/app/components/lawyer/HamiSettings/data/ExecutionIndexQuarantineRow';

describe('ExecutionIndexQuarantineRow', () => {
    beforeEach(() => {
        hasQ.mockReturnValue(true);
        claimQ.mockReturnValue(true);
    });

    it('hides when nothing is quarantined', () => {
        hasQ.mockReturnValue(false);
        const { container } = render(<ExecutionIndexQuarantineRow />);
        expect(container).toBeEmptyDOMElement();
    });

    it('claims after confirm and hides the row', async () => {
        render(<ExecutionIndexQuarantineRow />);
        await act(async () => {
            fireEvent.click(screen.getByTestId('settings-claim-quarantined-execution-index'));
        });
        expect(claimQ).toHaveBeenCalled();
        expect(screen.queryByTestId('settings-claim-quarantined-execution-index')).toBeNull();
    });
});
