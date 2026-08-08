import { describe, expect, it } from 'vitest';
import {
    buildOtherPartyActionLogEntry,
    persistOtherPartyActionLogEntry,
    prependOtherPartyActionLog,
} from '../otherPartyActionLogPersist';

describe('otherPartyActionLogPersist', () => {
    it('prepends log entry without duplicate id', () => {
        const first = buildOtherPartyActionLogEntry({ date: '2026-01-01', content: 'أول' });
        const second = buildOtherPartyActionLogEntry({ date: '2026-01-02', content: 'ثاني' });
        const merged = prependOtherPartyActionLog([first], second);
        expect(merged).toHaveLength(2);
        expect(merged[0]?.id).toBe(second.id);
    });

    it('persistOtherPartyActionLogEntry writes patch via persistExecutionMerge', () => {
        const patches: Record<string, unknown>[] = [];
        const entry = buildOtherPartyActionLogEntry({
            date: '2026-01-01',
            content: 'طلب',
            decisionRowId: 'dec-1',
        });
        const ok = persistOtherPartyActionLogEntry(
            (patch) => {
                patches.push(patch);
                return true;
            },
            [],
            entry,
        );
        expect(ok).toBe(true);
        expect(patches[0]?.other_party_actions_log).toEqual([entry]);
    });
});
