import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { probeSameOriginApi } from '@/app/runtime/sameOriginApiProbe';
import SecureStoreService from '@/app/services/SecureStoreService';
import { appModulePromise } from '@/boot/appModule';
import { scheduleDeferredAppStyles } from '@/app/runtime/deferredAppStyles';
import { installConsoleHygiene } from '@/app/utils/consoleHygiene';
import './styles/critical-shell.css';

installConsoleHygiene();

/** chunk اللوحة يُحمَّل عند LawyerDashboardGate / LawyerBootShell فقط — لا تنافس إقلاع التطبيق */
/** Vite dev: إعادة تحميل واحدة عند فشل dynamic import (HMR stale) */
if (import.meta.env.DEV) {
    const STALE_IMPORT_RELOAD_KEY = 'hami:vite-stale-import-reload';

    window.addEventListener('vite:preloadError', (event) => {
        const preloadEvent = event as Event & { payload?: { err?: unknown } };
        const err = preloadEvent.payload?.err;
        const msg = err instanceof Error ? err.message : String(err ?? '');
        if (!/Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
            return;
        }
        preloadEvent.preventDefault();
        try {
            if (!sessionStorage.getItem(STALE_IMPORT_RELOAD_KEY)) {
                sessionStorage.setItem(STALE_IMPORT_RELOAD_KEY, '1');
                window.location.reload();
                return;
            }
        } catch {
            /* ignore */
        }
        if (import.meta.hot) {
            import.meta.hot.invalidate();
        }
    });
}

function renderFatalBootError(e: unknown): void {
    console.error('❌ [System] Fatal Boot Error:', e);
    removeStaticBootShell();

    const wrap = document.createElement('div');
    wrap.setAttribute('data-testid', 'app-boot-fatal-error');
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-label', 'خطأ في إقلاع التطبيق');
    wrap.style.cssText =
        'color:#E6C673;background:#05060d;min-height:100vh;padding:30px;text-align:center;font-family:monospace;direction:rtl;';
    const h1 = document.createElement('h1');
    h1.style.cssText = 'color:#ff4444;margin-bottom:20px;';
    h1.textContent = '⚠️ خطأ في تحميل النظام';
    const p = document.createElement('p');
    p.style.marginBottom = '20px';
    p.textContent = 'فشل في تحميل التطبيق. يرجى المحاولة مرة أخرى.';
    const pre = document.createElement('pre');
    pre.style.cssText =
        'background:#111;padding:15px;border-radius:8px;overflow:auto;text-align:left;direction:ltr;border:1px solid #333;max-width:92vw;margin:0 auto;';
    const errText =
        e instanceof Error ? (e.stack ?? e.message) : typeof e === 'string' ? e : String(e);
    pre.textContent = errText;
    const btn = document.createElement('button');
    btn.style.cssText =
        'margin-top:20px;padding:12px 24px;background:#E6C673;color:#000;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;';
    btn.textContent = 'المحاولة مرة أخرى';
    btn.setAttribute('data-testid', 'app-boot-fatal-retry');
    btn.onclick = () => {
        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
        window.location.reload();
    };
    const onEscape = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        btn.click();
    };
    window.addEventListener('keydown', onEscape, true);
    wrap.appendChild(h1);
    wrap.appendChild(p);
    wrap.appendChild(pre);
    wrap.appendChild(btn);

    const root = document.getElementById('root');
    if (root) {
        root.replaceChildren(wrap);
    } else {
        document.body.appendChild(wrap);
    }
}

function runBackgroundBootTasks(): void {
    SecureStoreService.kickoffBootShellSync();
    void SecureStoreService.ensureBootShellReady().catch(() => {});
    void SecureStoreService.ensurePersistedReady().catch(() => {});

    void probeSameOriginApi();
    void import('@/app/bootstrap/deferredBoot').then((m) => m.runDeferredBootTasks());
}

async function mountApplication(): Promise<void> {
    markBootPhase('start');
    document.documentElement.dataset.hamiInitialBoot = '1';

    try {
        const [appMod, ReactMod, ReactDOMMod] = await Promise.all([
            appModulePromise,
            import('react'),
            import('react-dom/client'),
        ]);

        const rootElement = document.getElementById('root');
        if (!rootElement) throw new Error('Root element missing');

        const App = appMod.default;
        const React = ReactMod.default;
        const { createRoot } = ReactDOMMod;
        const root = createRoot(rootElement);

        root.render(
            import.meta.env.DEV
                ? React.createElement(React.StrictMode, null, React.createElement(App))
                : React.createElement(App),
        );

        markBootPhase('app-render');
        removeStaticBootShell();
        document.documentElement.removeAttribute('data-hami-initial-boot');
        scheduleDeferredAppStyles();

        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
    } catch (e) {
        renderFatalBootError(e);
    }
}

void mountApplication().finally(() => {
    runBackgroundBootTasks();
});
