import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { isBootRevealDone, markBootRevealDone, onBootContentReady } from '@/app/bootstrap/bootReveal';
import { loadAppModule } from '@/boot/appModule';
import { installConsoleHygiene } from '@/app/utils/consoleHygiene';
import { registerAppServiceWorker } from '@/app/runtime/appServiceWorker';
import { applySettingsToDom } from '@/app/services/settings/apply';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import './styles/critical-shell.css';

/** deferred-app بعد content-ready — لا ينافس HomeTab (~52KB) بـ ~577KB من أول بايت */
onBootContentReady(() => {
    void import('@/app/runtime/deferredAppStyles').then((m) => m.scheduleDeferredAppStyles());
});

/** طبّق إعدادات السطح قبل React — حدود/ثيم/خلفية مطابقة لأول إطار */
try {
    applySettingsToDom(getLawyerSettingsSnapshot());
    if (isBootRevealDone()) {
        document.documentElement.dataset.hamiBootRevealed = '1';
    }
} catch {
    try {
        document.documentElement.dataset.hamiHomeContainerBorder = '1';
        document.documentElement.dataset.hamiWallpaper = '0';
    } catch {
        /* ignore */
    }
}

const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

installConsoleHygiene();

/** إن اكتمل الإقلاع في هذه الجلسة — أزل الهيكل الثابت فوراً قبل React */
try {
    if (isBootRevealDone()) {
        markBootRevealDone();
        removeStaticBootShell();
    }
} catch {
    /* ignore */
}

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
    void Promise.all([
        import('@/app/services/SecureStoreService'),
        import('@/app/runtime/sameOriginApiProbe'),
        import('@/app/bootstrap/deferredBoot'),
    ]).then(([secureStoreModule, sameOriginApiProbeModule, deferredBootModule]) => {
        const SecureStoreService = secureStoreModule.default;
        SecureStoreService.kickoffBootShellSync();
        void SecureStoreService.ensureBootShellReady().catch(() => {});
        void SecureStoreService.ensurePersistedReady().catch(() => {});

        void sameOriginApiProbeModule.probeSameOriginApi();
        deferredBootModule.runDeferredBootTasks();
    });
}

function waitForAppRuntimeReady(timeoutMs = 4000): Promise<void> {
    return new Promise((resolve) => {
        if (document.documentElement.dataset.hamiAppRuntimeReady === '1') {
            resolve();
            return;
        }

        let settled = false;
        let timeoutId = 0;

        const finish = () => {
            if (settled) return;
            settled = true;
            window.removeEventListener(APP_RUNTIME_READY_EVENT, onReady);
            if (timeoutId) window.clearTimeout(timeoutId);
            resolve();
        };

        const onReady = () => {
            document.documentElement.dataset.hamiAppRuntimeReady = '1';
            finish();
        };

        window.addEventListener(APP_RUNTIME_READY_EVENT, onReady, { once: true });
        timeoutId = window.setTimeout(finish, timeoutMs);
    });
}

function waitForBootRevealDone(timeoutMs = 16_000): Promise<void> {
    return new Promise((resolve) => {
        try {
            if (
                window.__hamiBootRevealDone__ === true ||
                sessionStorage.getItem('hami_boot_complete') === '1'
            ) {
                resolve();
                return;
            }
        } catch {
            /* ignore */
        }

        let settled = false;
        let timeoutId = 0;

        const finish = () => {
            if (settled) return;
            settled = true;
            window.removeEventListener('hami:boot-reveal-done', onDone);
            if (timeoutId) window.clearTimeout(timeoutId);
            resolve();
        };

        const onDone = () => finish();
        window.addEventListener('hami:boot-reveal-done', onDone, { once: true });
        timeoutId = window.setTimeout(finish, timeoutMs);
    });
}

async function mountApplication(): Promise<void> {
    markBootPhase('start');
    document.documentElement.dataset.hamiInitialBoot = '1';

    try {
        /* أولاً App/React بلا منافسة compile مع stem اللوحة — على warm كان الـ preload المبكر يضر TTFI */
        const [appMod, ReactMod, ReactDOMMod] = await Promise.all([
            loadAppModule(),
            import('react'),
            import('react-dom/client'),
        ]);

        /* بعد جاهزية React: ابدأ Shell + Gate + علامة TTFI + LD موازياً لـ createRoot */
        void import('@/app/AppRuntimeShell');
        void import('@/app/bootstrap/LawyerDashboardGate');
        /* تسخين علامة interactive قبل LD — يمنع شلال app-ttfi-mark عند أول رسم */
        void import('@/app/bootstrap/dashboardInteractiveMark');
        void import('@/app/bootstrap/lawyerDashboardChunk').then((m) => {
            void m.preloadLawyerDashboardChunk();
        });

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
        await waitForAppRuntimeReady();
        // أبقِ الصدفة الثابتة حتى انتهاء كشف اللوحة — يمنع فراغ أسود بين الشعار والواجهة
        await waitForBootRevealDone();
        removeStaticBootShell();
        document.documentElement.removeAttribute('data-hami-initial-boot');
        if (import.meta.env.PROD) {
            void registerAppServiceWorker();
        }
        /* احتياطي بعد انتهاء الكشف — إن فُوّت مسار MainView/first-tab */
        void import('@/app/runtime/deferredAppStyles').then((m) => m.scheduleDeferredAppStyles());

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
