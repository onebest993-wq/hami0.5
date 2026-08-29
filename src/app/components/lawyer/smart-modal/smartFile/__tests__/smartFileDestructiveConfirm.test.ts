import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    SMART_FILE_DELETE_EVENT_MESSAGE,
    confirmSmartFileDestructiveAction,
} from '../smartFileDestructiveConfirm';

describe('smartFileDestructiveConfirm', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns true when user confirms', () => {
        vi.stubGlobal('confirm', vi.fn(() => true));
        expect(confirmSmartFileDestructiveAction(SMART_FILE_DELETE_EVENT_MESSAGE)).toBe(true);
        expect(confirm).toHaveBeenCalledWith(SMART_FILE_DELETE_EVENT_MESSAGE);
    });

    it('returns false when user cancels', () => {
        vi.stubGlobal('confirm', vi.fn(() => false));
        expect(confirmSmartFileDestructiveAction(SMART_FILE_DELETE_EVENT_MESSAGE)).toBe(false);
    });
});
