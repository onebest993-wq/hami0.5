// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { tearDownLitigationFloatingState } from '../tearDownLitigationFloatingState';

/**
 * P7 كان يضبط pointer-events:none على <html> ولا يُعيدها، فيموت كل تراكب
 * لا يُفعّل pointer-events لنفسه صراحةً — ومنها محضر المتابعة.
 */
describe('tearDownLitigationFloatingState — document root', () => {
    beforeEach(() => {
        document.documentElement.style.removeProperty('pointer-events');
    });

    it('لا يترك جذر المستند خاملاً تجاه المؤشّر', () => {
        tearDownLitigationFloatingState();
        expect(document.documentElement.style.pointerEvents).not.toBe('none');
    });

    it('لا يُبطل pointer-events مهما تكرّر النداء', () => {
        tearDownLitigationFloatingState({ reason: 'navigate-away' });
        tearDownLitigationFloatingState({ reason: 'unmount' });
        tearDownLitigationFloatingState();
        expect(getComputedStyle(document.documentElement).pointerEvents).not.toBe('none');
    });
});
