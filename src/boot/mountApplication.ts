import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import '@/app/bootstrap/homeMainGridPaintGate';
import {
    getBootRevealMaxMs,
    isDemoShellAuthBuild,
    applyInstantDemoBootFoundation,
} from '@/app/bootstrap/bootReveal';
import { loadAppModule } from '@/boot/appModule';

const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

/**
 * العطل الفادح يصل هنا وقد بقي مرئياً للمستخدم وحده.
 *
 * الإبلاغ المباشر غير مضمون: قد يكون سبب العطل نفسه هو تعذّر تحميل chunk، وقد
 * تُغلق الصفحة قبل أن يغادر الطلب. فيُكتب أولاً في الصندوق الأسود الذي يقرأه
 * أول إقلاع ناجح، ثم يُحاول الإرسال الفوري كإضافة لا كاعتماد.
 */
function reportFatalBootError(e: unknown, errText: string): void {
    try {
        localStorage.setItem(
            'hami:boot-failure:last',
            JSON.stringify({
                title: 'fatal-mount',
                detail: errText.slice(0, 2000),
                at: new Date().toISOString(),
                native: document.documentElement.getAttribute('data-hami-native') === '1' ? 1 : 0,
                url: location.pathname || '/',
            }),
        );
    } catch {
        /* التخزين محظور — يبقى الإرسال الفوري وحده */
    }
    void import('@/app/observability/sentryClient')
        .then((m) => m.sentryCaptureException(e, { source: 'mountApplication', phase: 'fatal-mount' }))
        .catch(() => undefined);
}

function renderFatalBootError(e: unknown): void {
    console.error('❌ [System] Fatal Boot Error:', e);
    removeStaticBootShell({ force: true });

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
    reportFatalBootError(e, errText);
    if (/clientEnv|VITE_SUPABASE/i.test(errText)) {
        const hint = document.createElement('p');
        hint.style.cssText =
            'color:#E6C673;margin:16px 0 0;max-width:92vw;font-size:14px;line-height:1.6;text-align:center;';
        hint.textContent =
            'على Vercel: Settings → Environment Variables → أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY لبيئة Production و Preview، ثم Redeploy.';
        wrap.insertBefore(hint, pre);
    }
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
        void SecureStoreService.ensureBootShellReady().catch(() => undefined);
        void SecureStoreService.ensurePersistedReady().catch(() => undefined);

        void sameOriginApiProbeModule.probeSameOriginApi();
        deferredBootModule.runDeferredBootTasks();
    });
}

function waitForAppRuntimeReady(timeoutMs?: number): Promise<void> {
    const resolvedTimeout =
        timeoutMs ??
        (typeof document !== 'undefined' && document.documentElement.getAttribute('data-hami-native') === '1'
            ? 8_000
            : 4_000);
    return new Promise((resolve) => {
        if (document.documentElement.dataset.hamiAppRuntimeReady === '1') {
            resolve();
            return;
        }

        let settled = false;
        let timeoutId = 0;

        const finish = (timedOut: boolean) => {
            if (settled) return;
            settled = true;
            window.removeEventListener(APP_RUNTIME_READY_EVENT, onReady);
            if (timeoutId) window.clearTimeout(timeoutId);
            if (timedOut) {
                try {
                    document.documentElement.dataset.hamiBootRuntimeTimeout = '1';
                } catch {
                    /* ignore */
                }
            }
            resolve();
        };

        const onReady = () => {
            document.documentElement.dataset.hamiAppRuntimeReady = '1';
            finish(false);
        };

        window.addEventListener(APP_RUNTIME_READY_EVENT, onReady, { once: true });
        timeoutId = window.setTimeout(() => finish(true), resolvedTimeout);
    });
}

function waitForBootRevealDone(timeoutMs = getBootRevealMaxMs() + 2_000): Promise<void> {
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

        const finish = (timedOut: boolean) => {
            if (settled) return;
            settled = true;
            window.removeEventListener('hami:boot-reveal-done', onDone);
            if (timeoutId) window.clearTimeout(timeoutId);
            if (timedOut) {
                try {
                    document.documentElement.dataset.hamiBootRevealTimeout = '1';
                } catch {
                    /* ignore */
                }
            }
            resolve();
        };

        const onDone = () => finish(false);
        window.addEventListener('hami:boot-reveal-done', onDone, { once: true });
        timeoutId = window.setTimeout(() => finish(true), timeoutMs);
    });
}

function withBootTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const timeoutId = window.setTimeout(() => {
            reject(new Error(`[boot] ${label} timed out after ${ms}ms`));
        }, ms);
        promise.then(
            (value) => {
                window.clearTimeout(timeoutId);
                resolve(value);
            },
            (error: unknown) => {
                window.clearTimeout(timeoutId);
                reject(error);
            },
        );
    });
}

async function mountApplication(): Promise<void> {
    markBootPhase('start');
    document.documentElement.dataset.hamiInitialBoot = '1';

    try {
        if (isDemoShellAuthBuild()) {
            void import('@/app/bootstrap/lawyerDashboardChunk').then((m) => {
                void m.preloadLawyerDashboardChunk();
            });
        }

        const clientEnvPromise = import('@/utils/supabase/clientEnv').then((m) => {
            m.assertClientEnvOrThrow();
        });

        /**
         * Shell + Gate يُحمَّلان من kickoffBootCriticalPreload بالتوازي من t=0.
         * لا نحجب createRoot عليهما — GateEntry يتجاوز Suspense عند الجاهزية.
         */
        const [appMod, ReactMod, ReactDOMMod] = await withBootTimeout(
            Promise.all([loadAppModule(), import('react'), import('react-dom/client')]),
            20_000,
            'core module load',
        );

        void import('@/app/runtime/appRuntimeShellLoader').then((m) => m.loadAppRuntimeShellModule());
        void import('@/app/runtime/lawyerDashboardGateLoader').then((m) =>
            m.loadLawyerDashboardGateModule(),
        );

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

        void clientEnvPromise.catch((envError: unknown) => {
            renderFatalBootError(envError);
        });

        await waitForAppRuntimeReady();
        if (isDemoShellAuthBuild()) {
            applyInstantDemoBootFoundation();
        }
        await waitForBootRevealDone();
        if (import.meta.env.PROD) {
            void import('@/app/runtime/appServiceWorker').then((m) => m.registerAppServiceWorker());
        }
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

let applicationBootStarted = false;

export function startApplicationBoot(): void {
    if (applicationBootStarted) return;
    applicationBootStarted = true;
    void import('@/app/hooks/lawyerDashboard/lawyerDashboardHeaderIntentBridge')
        .then((m) => m.discardPendingLawyerDashboardHeaderIntent())
        .catch(() => undefined);
    void mountApplication().finally(() => {
        runBackgroundBootTasks();
    });
}
