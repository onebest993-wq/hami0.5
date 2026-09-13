import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React, { useRef } from 'react';
import { useOverlayGhostClickShield } from '../useOverlayGhostClickShield';

function ShieldProbe({
    onInnerClick,
    durationMs = 10_000,
}: {
    onInnerClick: () => void;
    durationMs?: number;
}) {
    const rootRef = useRef<HTMLDivElement>(null);
    useOverlayGhostClickShield(rootRef, durationMs);
    return (
        <div ref={rootRef} data-testid="shield-root">
            <button type="button" data-testid="shield-inner" onClick={onInnerClick}>
                inner
            </button>
        </div>
    );
}

/**
 * **عقدُ السمة** — `data-hami-ghost-shield="armed"` ما دام الدرع يبتلع.
 *
 * مساعدُ E2E (`clickNativeElement`) ينتظر زوالها قبل الضغط، فكلُّ اعتماده على ثابتٍ واحد:
 * **غيابُ السمة ⇐ النقرُ يمرّ**. ولو زالت السمة قبل انقضاء نافذة الابتلاع ولو بجزءٍ من
 * الثانية، لضغط المساعدُ فابتُلع الضغط — وعاد السقوطُ المتذبذب الذي أُصلح من أجله.
 * فالحالةُ الثالثة أدناه تفحص الحدَّ نفسه لا ما حوله.
 *
 * و`performance` مع المؤقّتات مُزيَّفان معاً: الدرع يقيس بالأوّل ويُزيل السمة بالثاني، فلو
 * زُيِّف أحدهما دون الآخر لقِيس حدٌّ لا يوجد في المتصفّح.
 */
const ATTR = 'data-hami-ghost-shield';
const FAKE = { toFake: ['setTimeout', 'clearTimeout', 'performance'] as const };

afterEach(() => {
    vi.useRealTimers();
});

describe('useOverlayGhostClickShield', () => {
    it('يبتلع click داخل الطبقة فور التركيب', () => {
        const onInnerClick = vi.fn();
        const { getByTestId } = render(<ShieldProbe onInnerClick={onInnerClick} />);
        fireEvent.click(getByTestId('shield-inner'));
        expect(onInnerClick).not.toHaveBeenCalled();
    });

    it('يُعلن التسليحَ بسمةٍ على الجذر فور التركيب', () => {
        vi.useFakeTimers({ toFake: [...FAKE.toFake] });
        const { getByTestId } = render(<ShieldProbe onInnerClick={vi.fn()} durationMs={180} />);
        expect(getByTestId('shield-root').getAttribute(ATTR)).toBe('armed');
    });

    it('غيابُ السمة ⇐ النقرُ يمرّ — عند حدّ النافذة بالضبط، لا بعده', () => {
        vi.useFakeTimers({ toFake: [...FAKE.toFake] });
        const onInnerClick = vi.fn();
        const { getByTestId } = render(<ShieldProbe onInnerClick={onInnerClick} durationMs={180} />);
        const root = getByTestId('shield-root');

        vi.advanceTimersByTime(179);
        expect(root.getAttribute(ATTR)).toBe('armed');
        fireEvent.click(getByTestId('shield-inner'));
        expect(onInnerClick).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        expect(root.hasAttribute(ATTR)).toBe(false);
        fireEvent.click(getByTestId('shield-inner'));
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });

    it('فكُّ التركيب يُزيل السمة — فلا تبقى حالةٌ بعد سببها', () => {
        vi.useFakeTimers({ toFake: [...FAKE.toFake] });
        const { getByTestId, unmount } = render(<ShieldProbe onInnerClick={vi.fn()} durationMs={180} />);
        const root = getByTestId('shield-root');
        expect(root.getAttribute(ATTR)).toBe('armed');
        unmount();
        expect(root.hasAttribute(ATTR)).toBe(false);
    });

    it('مدّةٌ صفرية لا تُسلِّح ولا تبتلع', () => {
        const onInnerClick = vi.fn();
        const { getByTestId } = render(<ShieldProbe onInnerClick={onInnerClick} durationMs={0} />);
        expect(getByTestId('shield-root').hasAttribute(ATTR)).toBe(false);
        fireEvent.click(getByTestId('shield-inner'));
        expect(onInnerClick).toHaveBeenCalledTimes(1);
    });
});
