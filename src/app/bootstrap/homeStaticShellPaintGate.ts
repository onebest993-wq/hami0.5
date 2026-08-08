/** يُطلق من hami-boot.js عند كشف هيكل المنزل الثابت */
export const HOME_STATIC_SHELL_PAINTED_EVENT = 'hami:home-static-shell-painted';

let homeStaticShellPainted = false;

export function isHomeStaticShellPainted(): boolean {
    return homeStaticShellPainted;
}

export function resetHomeStaticShellPaintGateForTests(): void {
    homeStaticShellPainted = false;
}

export function markHomeStaticShellPainted(): void {
    if (typeof window === 'undefined' || homeStaticShellPainted) return;
    homeStaticShellPainted = true;
    try {
        if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
            performance.mark('hami:boot:home-static-shell-painted');
        }
        window.dispatchEvent(new Event(HOME_STATIC_SHELL_PAINTED_EVENT));
    } catch {
        /* ignore */
    }
}

export function wireHomeStaticShellPaintListener(): void {
    if (typeof window === 'undefined' || homeStaticShellPainted) return;

    const onPainted = () => {
        markHomeStaticShellPainted();
        window.removeEventListener(HOME_STATIC_SHELL_PAINTED_EVENT, onPainted);
    };

    window.addEventListener(HOME_STATIC_SHELL_PAINTED_EVENT, onPainted);

    try {
        const boot = document.getElementById('hami-static-boot');
        const phase = boot?.getAttribute('data-hami-phase');
        if (phase === 'shell' || phase === 'handoff') {
            markHomeStaticShellPainted();
        }
    } catch {
        /* ignore */
    }
}
