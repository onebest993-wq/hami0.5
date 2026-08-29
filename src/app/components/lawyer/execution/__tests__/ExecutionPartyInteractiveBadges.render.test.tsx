import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ExecutionPartyInteractiveBadges } from '../partyInteractiveBadges/ExecutionPartyInteractiveBadges';

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItemSync: () => null,
        setItemSync: () => undefined,
        getItem: async () => null,
        setItem: async () => undefined,
        ensurePersistedReady: async () => undefined,
    },
}));

describe('ExecutionPartyInteractiveBadges render', () => {
    it('يرسم شارة المذكرة دون ReferenceError من extraDefs', () => {
        expect(() => {
            render(
                <ExecutionPartyInteractiveBadges
                    executionId="exec-badges-1"
                    party="debtor"
                    isPrimaryDebtor
                    executionData={null}
                    activeCoerciveActions={[]}
                    seizedAssets={[]}
                    timelineEvents={[]}
                    hasGuarantor={false}
                    memoBadge={{
                        anchor: '2026-08-01',
                        remaining: 4,
                        graceExpired: false,
                    }}
                    absenceBadge={null}
                    showSummonsBadge={false}
                />,
            );
        }).not.toThrow();

        expect(screen.getByRole('button', { name: /تبليغ بالمذكرة/ })).toBeTruthy();
    });
});
