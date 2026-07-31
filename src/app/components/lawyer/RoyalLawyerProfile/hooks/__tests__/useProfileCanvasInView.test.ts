import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { useProfileCanvasInView } from '../useProfileCanvasInView';

describe('useProfileCanvasInView', () => {
    let observe: ReturnType<typeof vi.fn>;
    let disconnect: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        observe = vi.fn();
        disconnect = vi.fn();
        vi.stubGlobal(
            'IntersectionObserver',
            vi.fn(function MockIO(this: { observe: typeof observe; disconnect: typeof disconnect }) {
                this.observe = observe;
                this.disconnect = disconnect;
            }),
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.replaceChildren();
    });

    it('لا يراقب عندما الصفحة مخفية (keepAlive)', async () => {
        const root = document.createElement('div');
        root.setAttribute('data-lawyer-profile-root', '');
        root.setAttribute('data-profile-page-hidden', 'true');
        const target = document.createElement('div');
        root.appendChild(target);
        document.body.appendChild(root);

        const ref = createRef<HTMLDivElement>();
        (ref as { current: HTMLDivElement | null }).current = target;

        const { result } = renderHook(() => useProfileCanvasInView(ref));

        await waitFor(() => expect(result.current).toBe(false));
        expect(observe).not.toHaveBeenCalled();
    });

    it('يراقب عندما الصفحة ظاهرة', async () => {
        const root = document.createElement('div');
        root.setAttribute('data-lawyer-profile-root', '');
        const target = document.createElement('div');
        root.appendChild(target);
        document.body.appendChild(root);

        const ref = createRef<HTMLDivElement>();
        (ref as { current: HTMLDivElement | null }).current = target;

        renderHook(() => useProfileCanvasInView(ref));

        await waitFor(() => expect(observe).toHaveBeenCalledWith(target));
    });
});
