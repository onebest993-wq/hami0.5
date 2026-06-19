import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import SecureStoreService from '@/app/services/SecureStoreService';
import { hasPersistedSupabaseSession } from '@/app/utils/authStorage';
import { PrefetchScheduler } from '@/app/runtime/prefetchScheduler';
/** Dev: static import — dynamic import('./app/App') breaks with Vite HMR stale modules */
import App from './app/App';

if (!import.meta.env.DEV && hasPersistedSupabaseSession()) {
    void import('@/app/runtime/lawyerDashboardLoader').then((m) => m.prefetchLawyerDashboardEntry());
}
if (hasPersistedSupabaseSession()) {
    PrefetchScheduler.planAuthenticatedEntry();
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

function removeBootLoader(): void {
    const w = window as Window & { removeLoader?: () => void };
    if (typeof w.removeLoader === 'function') {
        w.removeLoader();
        return;
    }
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        window.setTimeout(() => loader.remove(), 400);
    }
}

function renderFatalBootError(e: unknown): void {
    console.error('❌ [System] Fatal Boot Error:', e);
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.remove();

    while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
    }
    const wrap = document.createElement('div');
    wrap.style.cssText =
        'color:#E6C673;background:#000;padding:30px;text-align:center;font-family:monospace;direction:rtl;';
    const h1 = document.createElement('h1');
    h1.style.cssText = 'color:#ff4444;margin-bottom:20px;';
    h1.textContent = '⚠️ خطأ في تحميل النظام';
    const p = document.createElement('p');
    p.style.marginBottom = '20px';
    p.textContent = 'فشل في تحميل التطبيق. يرجى المحاولة مرة أخرى.';
    const pre = document.createElement('pre');
    pre.style.cssText =
        'background:#111;padding:15px;border-radius:8px;overflow:auto;text-align:left;direction:ltr;border:1px solid #333;';
    const errText =
        e instanceof Error ? (e.stack ?? e.message) : typeof e === 'string' ? e : String(e);
    pre.textContent = errText;
    const btn = document.createElement('button');
    btn.style.cssText =
        'margin-top:20px;padding:12px 24px;background:#E6C673;color:#000;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;';
    btn.textContent = 'المحاولة مرة أخرى';
    btn.onclick = () => {
        try {
            sessionStorage.removeItem('hami:vite-stale-import-reload');
        } catch {
            /* ignore */
        }
        window.location.reload();
    };
    wrap.appendChild(h1);
    wrap.appendChild(p);
    wrap.appendChild(pre);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
}

async function bootApp(): Promise<void> {
    void SecureStoreService.ensurePersistedReady().catch((e) => {
        console.error('[Boot] فشل تهيئة التخزين المحلي:', e);
    });

    const { runDeferredBootTasks } = await import('@/app/bootstrap/deferredBoot');

    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error('Root element missing');

    const root = ReactDOM.createRoot(rootElement);
    root.render(
        import.meta.env.DEV ? (
            <React.StrictMode>
                <App />
            </React.StrictMode>
        ) : (
            <App />
        ),
    );

    try {
        sessionStorage.removeItem('hami:vite-stale-import-reload');
    } catch {
        /* ignore */
    }

    removeBootLoader();
    requestAnimationFrame(removeBootLoader);
    runDeferredBootTasks();
}

void bootApp().catch(renderFatalBootError);
