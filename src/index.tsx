import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/index.css';
import App from './app/App';
import { initWebVitalsLogging } from '@/app/utils/webVitalsObserver';

// 🛡️ Bootloader - Enhanced Error Handling with Sentry
// Timestamp: 1772728810880

const initApp = () => {
  try {
    if (import.meta.env.DEV) {
      try {
        initWebVitalsLogging();
      } catch (e) {
        console.warn('[WebVitals] init failed', e);
      }
    }

    if (typeof document !== 'undefined') {
      const w = window as unknown as { __hamiSubmitGuardInstalled?: boolean };
      if (!w.__hamiSubmitGuardInstalled) {
        w.__hamiSubmitGuardInstalled = true;
        const stopSubmit = (ev: Event) => {
          ev.preventDefault();
        };
        document.addEventListener('submit', stopSubmit, true);
      }
    }

    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        __hamiIraqDateFormatInstalled?: boolean;
        __hamiArabicDatePickersInstalled?: boolean;
      };
      if (!w.__hamiIraqDateFormatInstalled) {
        w.__hamiIraqDateFormatInstalled = true;
        const pad2 = (n: number) => String(n).padStart(2, '0');
        const formatDate = (d: Date) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
        const formatTime = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

        const originalToLocaleDateString = Date.prototype.toLocaleDateString;
        const originalToLocaleString = Date.prototype.toLocaleString;

        Date.prototype.toLocaleDateString = function (locales?: any, options?: any) {
          try {
            const d = this as unknown as Date;
            if (!(d instanceof Date) || Number.isNaN(d.getTime())) return originalToLocaleDateString.call(d as any, locales, options);
            return formatDate(d);
          } catch {
            return originalToLocaleDateString.call(this as any, locales, options);
          }
        };

        Date.prototype.toLocaleString = function (locales?: any, options?: any) {
          try {
            const d = this as unknown as Date;
            if (!(d instanceof Date) || Number.isNaN(d.getTime())) return originalToLocaleString.call(d as any, locales, options);
            return `${formatDate(d)} ${formatTime(d)}`;
          } catch {
            return originalToLocaleString.call(this as any, locales, options);
          }
        };
      }

      if (!w.__hamiArabicDatePickersInstalled) {
        w.__hamiArabicDatePickersInstalled = true;

        const apply = () => {
          try {
            const inputs = document.querySelectorAll('input[type="date"]');
            inputs.forEach((el) => {
              try {
                el.setAttribute('lang', 'ar-IQ');
                el.setAttribute('dir', 'ltr');
                el.setAttribute('placeholder', 'DD/MM/YYYY');
                el.setAttribute('title', 'DD/MM/YYYY');
                el.setAttribute('data-date-format', 'dmy');
                if (el.getAttribute('lang') === 'en-GB' || el.getAttribute('lang') === 'en-US') {
                  el.setAttribute('lang', 'ar-IQ');
                }
              } catch {
                /* ignore */
              }
            });
          } catch {
            /* ignore */
          }
        };

        apply();
        try {
          let debounceTimer: number | null = null;
          let disconnected = false;
          const mo = new MutationObserver(() => {
            if (disconnected) return;
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
            debounceTimer = window.setTimeout(() => {
              debounceTimer = null;
              apply();
            }, 400);
          });
          mo.observe(document.documentElement, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['type'],
          });
          window.setTimeout(() => {
            disconnected = true;
            mo.disconnect();
            if (debounceTimer !== null) window.clearTimeout(debounceTimer);
          }, 8_000);
        } catch {
          /* ignore */
        }
      }
    }

    const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
    if (sentryDsn && !sentryDsn.includes('examplePublicKey')) {
      const isProd = import.meta.env.PROD;
      try {
        void import('@sentry/react')
          .then((Sentry) => {
            Sentry.init({
              dsn: sentryDsn,
              integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration({
                  maskAllText: false,
                  blockAllMedia: false,
                }),
              ],
              tracesSampleRate: isProd ? 0.12 : 1,
              replaysSessionSampleRate: isProd ? 0.02 : 0.1,
              replaysOnErrorSampleRate: 1,
              environment: import.meta.env.MODE,
              beforeSend(event) {
                if (event.level === 'warning') {
                  return null;
                }
                return event;
              },
            });

            if (import.meta.env.DEV) {
              console.log('✅ [Sentry] Error tracking initialized');
            }
          })
          .catch((e) => {
            console.warn('[Sentry] init failed', e);
          });
      } catch (e) {
        console.warn('[Sentry] init failed', e);
      }
    }

    const rootElement = document.getElementById('root');
    if (!rootElement) throw new Error("Root element missing");

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      import.meta.env.DEV ? (
        <React.StrictMode>
          <App />
        </React.StrictMode>
      ) : (
        <App />
      )
    );

    // Remove HTML loading overlay after React mounts (don't depend on App's useEffect)
    const removeLoader = () => {
      const w = window as Window & { removeLoader?: () => void };
      if (typeof w.removeLoader === 'function') {
        w.removeLoader();
      } else {
        const loader = document.getElementById('loading-overlay');
        if (loader) {
          loader.style.opacity = '0';
          setTimeout(() => loader.remove(), 500);
        }
      }
    };
    removeLoader();
    requestAnimationFrame(removeLoader);

  } catch (e: any) {
    console.error("❌ [System] Fatal Boot Error:", e);
    
    // Remove loading overlay if exists
    const loader = document.getElementById('loading-overlay');
    if (loader) loader.remove();
    
    // Show detailed error on screen (DOM + textContent — avoid XSS from error strings)
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
    const errText = e instanceof Error ? (e.stack ?? e.message) : typeof e === 'string' ? e : String(e);
    pre.textContent = errText;
    const btn = document.createElement('button');
    btn.style.cssText =
      'margin-top:20px;padding:12px 24px;background:#E6C673;color:#000;border:none;border-radius:8px;font-size:16px;font-weight:bold;cursor:pointer;';
    btn.textContent = 'المحاولة مرة أخرى';
    btn.onclick = () => initApp();
    wrap.appendChild(h1);
    wrap.appendChild(p);
    wrap.appendChild(pre);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }
};

// Initialize app
initApp();
