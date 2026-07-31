import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeGlobalSearchOverlayInteractive } from '@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive';

describe('observeGlobalSearchOverlayInteractive', () => {
    beforeEach(() => {
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible' as DocumentVisibilityState,
        });
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            get: () => false,
        });
        document.body.innerHTML = `
          <div data-hami-global-search-shell>
            <div data-search-open="true">
              <div data-testid="global-search-overlay">
                <input data-testid="global-search-input" />
              </div>
            </div>
          </div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('يستدعي onInteractive عند اكتمال الطبقة داخل shell', () => {
        expect(
            document.querySelector(
                '[data-search-open="true"] [data-testid="global-search-overlay"]',
            ),
        ).not.toBeNull();
        expect(
            document.querySelector(
                '[data-search-open="true"] [data-testid="global-search-input"]',
            ),
        ).not.toBeNull();
        expect(document.hidden).toBe(false);

        const onInteractive = vi.fn();
        const cleanup = observeGlobalSearchOverlayInteractive({
            isDone: () => false,
            onInteractive,
        });

        expect(onInteractive).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('يتجاهل keepWarm المغلق (data-search-open=false)', () => {
        document.body.innerHTML = `
          <div data-hami-global-search-shell>
            <div data-search-open="false" data-testid="global-search-overlay">
              <input data-testid="global-search-input" />
            </div>
          </div>
        `;
        const onInteractive = vi.fn();
        const cleanup = observeGlobalSearchOverlayInteractive({
            isDone: () => false,
            onInteractive,
        });
        expect(onInteractive).not.toHaveBeenCalled();
        cleanup();
    });

    it('يتوقف عند isDone ولا يراقب document.body', () => {
        document.body.innerHTML = `<div data-hami-global-search-shell></div>`;
        let done = false;
        const onInteractive = vi.fn();
        const cleanup = observeGlobalSearchOverlayInteractive({
            isDone: () => done,
            onInteractive,
        });

        expect(onInteractive).not.toHaveBeenCalled();
        done = true;
        document.querySelector('[data-hami-global-search-shell]')!.innerHTML = `
            <div data-search-open="true">
              <div data-testid="global-search-overlay">
                <input data-testid="global-search-input" />
              </div>
            </div>
        `;
        cleanup();
        expect(onInteractive).not.toHaveBeenCalled();
    });
});
