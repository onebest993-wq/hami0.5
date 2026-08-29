import { describe, expect, it } from 'vitest';
import { shouldNotifyParentEvictionLedgerActivated } from '../useFocCollectionActions';

describe('shouldNotifyParentEvictionLedgerActivated', () => {
    it('notifies only the first eviction collection activation', () => {
        expect(shouldNotifyParentEvictionLedgerActivated(true, false)).toBe(true);
        expect(shouldNotifyParentEvictionLedgerActivated(true, true)).toBe(false);
        expect(shouldNotifyParentEvictionLedgerActivated(false, false)).toBe(false);
    });
});
