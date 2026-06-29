import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeNotificationPanelInteractive } from '@/app/hooks/lawyerDashboard/observeNotificationPanelInteractive';

describe('observeNotificationPanelInteractive', () => {
    beforeEach(() => {
        document.body.innerHTML = `
          <div data-hami-notification-shell>
            <div data-testid="notification-panel">
              <button data-testid="notification-tab-forum">forum</button>
            </div>
          </div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('يستدعي onInteractive عند اكتمال اللوحة داخل shell', () => {
        const onInteractive = vi.fn();
        const cleanup = observeNotificationPanelInteractive({
            isDone: () => false,
            onInteractive,
        });

        expect(onInteractive).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('يتوقف عند isDone ولا يراقب document.body', () => {
        document.body.innerHTML = `<div data-hami-notification-shell></div>`;
        let done = false;
        const onInteractive = vi.fn();
        const cleanup = observeNotificationPanelInteractive({
            isDone: () => done,
            onInteractive,
        });

        expect(onInteractive).not.toHaveBeenCalled();
        done = true;
        document.querySelector('[data-hami-notification-shell]')!.innerHTML = `
            <div data-testid="notification-panel">
              <button data-testid="notification-tab-forum">late</button>
            </div>
        `;
        cleanup();
        expect(onInteractive).not.toHaveBeenCalled();
    });
});
