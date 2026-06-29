import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeGlobalSearchOverlayInteractive } from '@/app/hooks/lawyerDashboard/observeGlobalSearchOverlayInteractive';

describe('observeGlobalSearchOverlayInteractive', () => {
    beforeEach(() => {
        document.body.innerHTML = `
          <div data-hami-global-search-shell>
            <div data-testid="global-search-overlay">
              <input data-testid="global-search-input" />
            </div>
          </div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('يستدعي onInteractive عند اكتمال الطبقة داخل shell', () => {
        const onInteractive = vi.fn();
        const cleanup = observeGlobalSearchOverlayInteractive({
            isDone: () => false,
            onInteractive,
        });

        expect(onInteractive).toHaveBeenCalledTimes(1);
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
            <div data-testid="global-search-overlay">
              <input data-testid="global-search-input" />
            </div>
        `;
        cleanup();
        expect(onInteractive).not.toHaveBeenCalled();
    });
});
