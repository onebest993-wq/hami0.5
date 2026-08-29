/** حركة شريط الإقلاع عبر left + setInterval — rAF/transform يُجمَّدان في المتصفح المضمّن وتقليل الحركة. */

export const BOOT_PROGRESS_CYCLE_MS = 1_100;

export function startBootProgressMotion(root: ParentNode): () => void {
    const fill = root.querySelector<HTMLElement>('.hami-boot-progress-fill');
    if (!fill) return () => undefined;

    fill.style.animation = 'none';
    fill.style.transform = 'none';
    fill.style.willChange = 'left';
    const t0 = performance.now();

    const tick = () => {
        if (!fill.isConnected) return;
        const u = ((performance.now() - t0) % BOOT_PROGRESS_CYCLE_MS) / BOOT_PROGRESS_CYCLE_MS;
        fill.style.left = `${-40 + u * 140}%`;
    };

    tick();
    const timer = window.setInterval(tick, 32);
    return () => window.clearInterval(timer);
}
