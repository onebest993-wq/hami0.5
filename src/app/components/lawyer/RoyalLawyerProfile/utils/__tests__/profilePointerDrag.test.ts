import { describe, expect, it, vi } from 'vitest';
import {
    capturePointerSafe,
    isPrimaryDragPointer,
    preventDefaultIfCancelable,
    releasePointerSafe,
} from '@/app/components/lawyer/RoyalLawyerProfile/utils/profilePointerDrag';

describe('profilePointerDrag', () => {
    it('يقبل لمس أندرويد بزر -1 أو pointerType touch', () => {
        expect(isPrimaryDragPointer({ button: -1, pointerType: 'touch' })).toBe(true);
        expect(isPrimaryDragPointer({ button: 0, pointerType: 'touch' })).toBe(true);
        expect(isPrimaryDragPointer({ button: 0, pointerType: 'mouse' })).toBe(true);
        expect(isPrimaryDragPointer({ button: 1, pointerType: 'mouse' })).toBe(false);
        expect(isPrimaryDragPointer({ button: 2, pointerType: 'mouse' })).toBe(false);
    });

    it('لا يرمي إن فشل setPointerCapture', () => {
        const el = document.createElement('div');
        Object.defineProperty(el, 'setPointerCapture', {
            value: () => {
                throw new Error('InvalidStateError');
            },
        });
        expect(capturePointerSafe(el, 7)).toBe(false);
        expect(capturePointerSafe(null, 7)).toBe(false);
        expect(() => releasePointerSafe(el, 7)).not.toThrow();
    });

    it('يمنع الافتراضي فقط إن كان cancelable', () => {
        const cancelable = { cancelable: true, preventDefault: vi.fn() };
        const frozen = { cancelable: false, preventDefault: vi.fn() };
        preventDefaultIfCancelable(cancelable);
        preventDefaultIfCancelable(frozen);
        expect(cancelable.preventDefault).toHaveBeenCalledTimes(1);
        expect(frozen.preventDefault).not.toHaveBeenCalled();
    });
});
