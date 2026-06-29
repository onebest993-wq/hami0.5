import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeSettingsSectionInteractive } from '@/app/components/lawyer/HamiSettings/hooks/observeSettingsSectionInteractive';

describe('observeSettingsSectionInteractive', () => {
    beforeEach(() => {
        document.body.innerHTML = `
          <div data-hami-settings-shell>
            <div data-testid="settings-section-appearance">ok</div>
          </div>
        `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.restoreAllMocks();
    });

    it('يستدعي onInteractive عند وجود القسم داخل shell فقط', () => {
        const onInteractive = vi.fn();
        const cleanup = observeSettingsSectionInteractive({
            activeSection: 'appearance',
            isDone: () => false,
            onInteractive,
        });

        expect(onInteractive).toHaveBeenCalledTimes(1);
        cleanup();
    });

    it('لا يراقب document.body — يتوقف عند isDone', () => {
        let done = false;
        const onInteractive = vi.fn();
        const cleanup = observeSettingsSectionInteractive({
            activeSection: 'security',
            isDone: () => done,
            onInteractive,
        });

        expect(onInteractive).not.toHaveBeenCalled();
        done = true;
        document.body.innerHTML += '<div data-testid="settings-section-security">late</div>';
        cleanup();
        expect(onInteractive).not.toHaveBeenCalled();
    });
});
