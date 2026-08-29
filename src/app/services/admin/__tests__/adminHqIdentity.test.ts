import { describe, expect, it } from 'vitest';
import { isHeadquartersMasterMailbox } from '@/app/services/admin/adminHqIdentity';

describe('isHeadquartersMasterMailbox', () => {
    it('accepts the canonical HQ mailbox', () => {
        expect(isHeadquartersMasterMailbox('Hami.Apps@proton.me')).toBe(true);
        expect(isHeadquartersMasterMailbox('lawyer@example.com')).toBe(false);
        expect(isHeadquartersMasterMailbox(null)).toBe(false);
    });
});
