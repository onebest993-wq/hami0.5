import type { SettingsSectionId } from '@/app/services/settings';

const SECTION_TEST_IDS: Record<SettingsSectionId, string> = {
    appearance: 'settings-section-appearance',
    security: 'settings-section-security',
    data: 'settings-section-data',
    account: 'settings-section-account',
};

const SETTINGS_SHELL_SELECTOR = '[data-hami-settings-shell]:not([data-settings-loading])';

export type ObserveSettingsSectionInteractiveInput = {
    activeSection: SettingsSectionId;
    onInteractive: () => void;
    isDone: () => boolean;
};

/** مراقبة محدودة لشجرة الإعدادات فقط — بلا document.body (أداء موبايل). */
export function observeSettingsSectionInteractive({
    activeSection,
    onInteractive,
    isDone,
}: ObserveSettingsSectionInteractiveInput): () => void {
    const testId = SECTION_TEST_IDS[activeSection];
    let rafId = 0;

    const tryMark = () => {
        if (isDone() || (typeof document !== 'undefined' && document.hidden)) return;
        const shell = document.querySelector(SETTINGS_SHELL_SELECTOR);
        const el = shell?.querySelector(`[data-testid="${testId}"]`);
        if (!el) return;
        onInteractive();
    };

    const scheduleTry = () => {
        if (isDone()) return;
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tryMark);
    };

    tryMark();
    if (isDone()) return () => undefined;

    rafId = requestAnimationFrame(tryMark);

    const shell = document.querySelector(SETTINGS_SHELL_SELECTOR);
    const panel = document.querySelector('[data-testid="settings-section-panel"]');
    const root = panel ?? shell;
    const obs =
        root &&
        new MutationObserver(() => {
            scheduleTry();
        });
    obs?.observe(root, { childList: true, subtree: true });

    const onVisibility = () => {
        if (!document.hidden) scheduleTry();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const timeout = window.setTimeout(tryMark, 30_000);

    return () => {
        cancelAnimationFrame(rafId);
        obs?.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        window.clearTimeout(timeout);
    };
}
