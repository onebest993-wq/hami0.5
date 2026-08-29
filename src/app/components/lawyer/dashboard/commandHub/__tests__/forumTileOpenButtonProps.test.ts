import { describe, expect, it, vi } from 'vitest';
import { forumTileOpenButtonProps, forumTilePrefetchHandlers } from '../forumTileOpenButtonProps';

describe('forumTileOpenButtonProps', () => {
    it('يعطّل التبويب في وضع التخطيط', () => {
        const press = {
            onPointerDown: vi.fn(),
            onPointerMove: vi.fn(),
            onPointerUp: vi.fn(),
            onPointerCancel: vi.fn(),
            onClick: vi.fn(),
        };
        const props = forumTileOpenButtonProps({}, press, true);
        expect(props.disabled).toBe(true);
        expect(props.tabIndex).toBe(-1);
        expect(forumTilePrefetchHandlers(true, vi.fn()).onPointerEnter).toBeUndefined();
        expect(forumTilePrefetchHandlers(false, undefined).onFocus).toBeUndefined();
        const live = forumTilePrefetchHandlers(false, vi.fn());
        expect(live.onPointerDown).toBe(live.onFocus);
    });
});
