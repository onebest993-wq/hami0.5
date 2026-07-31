import { describe, expect, it } from 'vitest';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '../executionModalMobileShell';

describe('executionModalMobileShell', () => {
    it('exposes Capacitor-ready touch and safe-area classes', () => {
        expect(EXEC_MODAL_CLOSE_BTN_CLASS).toMatch(/min-h-\[44px\]/);
        expect(EXEC_MODAL_CLOSE_BTN_CLASS).toMatch(/min-w-\[44px\]/);
        expect(EXEC_MODAL_CLOSE_BTN_CLASS).toMatch(/touch-manipulation/);
        expect(EXEC_MODAL_EDIT_PRIMARY_BTN_CLASS).toMatch(/min-h-\[44px\]/);
        expect(EXEC_MODAL_TOUCH_TARGET).toMatch(/min-h-\[44px\]/);
        expect(EXEC_MODAL_TOUCH_TARGET).toMatch(/touch-manipulation/);
        expect(EXEC_MODAL_HEADER_SAFE_TOP).toMatch(/safe-area-inset-top/);
        expect(EXEC_MODAL_BACKDROP_SAFE_PAD).toMatch(/safe-area-inset-bottom/);
    });
});
