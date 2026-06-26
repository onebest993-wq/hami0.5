import { describe, expect, it } from 'vitest';
import { assignMutableRefCurrent } from '../assignMutableRefCurrent';

describe('assignMutableRefCurrent', () => {
    it('assigns when ref object is valid', () => {
        const ref = { current: null as HTMLDivElement | null };
        const el = document.createElement('div');
        assignMutableRefCurrent(ref, el);
        expect(ref.current).toBe(el);
    });

    it('no-ops when ref is undefined', () => {
        expect(() => assignMutableRefCurrent(undefined, document.createElement('div'))).not.toThrow();
    });
});
