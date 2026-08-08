import { describe, expect, it, vi } from 'vitest';
import { buildPhoneBodyPartyDeathMenuHandler } from '../buildPhoneBodyPartyDeathMenuHandler';

describe('buildPhoneBodyPartyDeathMenuHandler', () => {
    it('invokes nested partyDeathHandlers opener when flat key is missing', () => {
        const opener = vi.fn();
        const scopeRef = {
            current: {
                partyDeathHandlers: {
                    handleDebtorDeathMenuAction: opener,
                },
            },
        };
        const handler = buildPhoneBodyPartyDeathMenuHandler(scopeRef, {}, 'handleDebtorDeathMenuAction');
        handler();
        expect(opener).toHaveBeenCalledTimes(1);
    });

    it('prefetches and shows toast when no live handler exists', () => {
        const showToast = vi.fn();
        const handler = buildPhoneBodyPartyDeathMenuHandler(
            { current: { showToast } },
            {},
            'handleCreditorDeathMenuAction',
        );
        handler();
        expect(showToast).toHaveBeenCalledWith(
            'جاري تجهيز أداة الإبلاغ عن الوفاة — أعد المحاولة بعد لحظة.',
            'info',
        );
    });
});
