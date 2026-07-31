/**
 * Hami boot script — externalized for strict CSP (no inline script-src).
 * يُعلن shell-visible فوراً — لا شاشة سوداء.
 */
(function () {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      /* أصل الجدول الزمني قبل أي مرحلة — يمنع ms سالبة لـ static-shell */
      performance.mark('hami:boot:start');
      performance.mark('hami:boot:static-shell-visible');
    } catch (_e) {
      /* ignore */
    }
  }

  /** إن اكتمل الإقلاع في الجلسة — لا تُبقِ الهيكل الثابت مرئياً عند الرجوع/إعادة الدخول */
  try {
    var bootDone =
      sessionStorage.getItem('hami_boot_complete') === '1' ||
      sessionStorage.getItem('hami_splash_executed') === '1';
    if (bootDone) {
      window.__hamiBootRevealDone__ = true;
      var staticBoot = document.getElementById('hami-static-boot');
      if (staticBoot && staticBoot.parentNode) staticBoot.parentNode.removeChild(staticBoot);
      if (document.documentElement) {
        document.documentElement.classList.remove('hami-boot-static-active');
      }
    }
  } catch (_eSplash) {
    /* ignore */
  }

  /** كشف مبكر — قبل React — لتعطيل الضبابية الثقيلة على الأجهزة المتواضعة */
  try {
    var nav = typeof navigator !== 'undefined' ? navigator : null;
    if (nav && document.documentElement) {
      var mem = nav.deviceMemory;
      var cores = nav.hardwareConcurrency;
      var conn = nav.connection;
      var modest = false;
      if (typeof mem === 'number' && mem > 0 && mem <= 4) modest = true;
      else if (
        typeof cores === 'number' &&
        cores > 0 &&
        cores <= 6 &&
        (typeof mem !== 'number' || mem <= 6)
      ) {
        modest = true;
      }
      if (conn && conn.saveData) modest = true;
      var et = conn && conn.effectiveType ? String(conn.effectiveType) : '';
      if (et === 'slow-2g' || et === '2g' || et === '3g') modest = true;
      if (
        !modest &&
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(pointer: coarse)').matches &&
        window.innerWidth <= 520
      ) {
        /* على الأصلي لا نفعّل lite من حجم الشاشة وحده — يقتل زخرفة اللوحة */
        var isCapNative =
          typeof window.Capacitor !== 'undefined' &&
          typeof window.Capacitor.isNativePlatform === 'function' &&
          window.Capacitor.isNativePlatform();
        if (!isCapNative) modest = true;
      }
      if (modest) document.documentElement.setAttribute('data-hami-lite', '1');
    }

    try {
      var cap = typeof window !== 'undefined' ? window.Capacitor : null;
      var ua = typeof navigator !== 'undefined' ? String(navigator.userAgent || '') : '';
      var alreadyNative = document.documentElement.getAttribute('data-hami-native') === '1';
      if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
        document.documentElement.setAttribute('data-hami-native', '1');
        var plat = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
        document.documentElement.setAttribute('data-hami-platform', plat || 'web');
        document.documentElement.classList.add('hami-native-shell');
        /* نص الإقلاع يبقى في #hami-static-boot حتى جاهزية اللوحة — بلا تخطي مبكر */
      } else if (
        !alreadyNative &&
        /Android/i.test(ua) &&
        (/;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua))
      ) {
        document.documentElement.setAttribute('data-hami-native', '1');
        document.documentElement.setAttribute('data-hami-platform', 'android');
        document.documentElement.classList.add('hami-native-shell');
      } else if (!alreadyNative && document.documentElement) {
        document.documentElement.setAttribute('data-hami-native', '0');
        document.documentElement.setAttribute('data-hami-platform', 'web');
      }
    } catch (_e2) {
      /* ignore */
    }
  } catch (_e) {
    /* ignore */
  }

  function ensureBootFailureLayer() {
    var layer = document.getElementById('hami-boot-failure');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'hami-boot-failure';
    layer.setAttribute('data-testid', 'hami-boot-failure');
    layer.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#000;display:none;align-items:center;justify-content:center;padding:24px;direction:rtl;';
    document.body.appendChild(layer);
    return layer;
  }

  var bootFailureShown = false;

  function showBootFailure(title, detail) {
    if (bootFailureShown) return;
    bootFailureShown = true;
    var layer = ensureBootFailureLayer();
    layer.style.display = 'flex';
    layer.style.flexDirection = 'column';
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    var h1 = document.createElement('h1');
    h1.style.cssText = 'color:#ff4444;margin:0 0 12px;font-family:monospace;font-size:18px;';
    h1.textContent = title || 'System Error';

    var pre = document.createElement('pre');
    pre.style.cssText =
      'color:#fff;text-align:left;background:#111;padding:12px;border-radius:8px;max-width:92vw;overflow:auto;direction:ltr;font-size:12px;border:1px solid #333;white-space:pre-wrap;';
    pre.textContent = detail || 'Unknown boot error';

    var hint = null;
    if (/Maximum call stack size exceeded/i.test(String(detail || ''))) {
      hint = document.createElement('p');
      hint.style.cssText =
        'color:#E6C673;margin:12px 0 0;max-width:92vw;font-size:13px;line-height:1.5;text-align:center;font-family:Tajawal,Cairo,sans-serif;';
      hint.textContent =
        'غالباً من HMR تالف أثناء التطوير. أوقف npm run dev، امسح node_modules/.vite، أعد التشغيل، ثم Ctrl+Shift+R.';
    } else if (/Component is not a function/i.test(String(detail || ''))) {
      hint = document.createElement('p');
      hint.style.cssText =
        'color:#E6C673;margin:12px 0 0;max-width:92vw;font-size:13px;line-height:1.5;text-align:center;font-family:Tajawal,Cairo,sans-serif;';
      hint.textContent =
        'غالباً وحدة React تالفة بعد HMR. اضغط Reload أو Ctrl+Shift+R. إن استمر: امسح node_modules/.vite وأعد npm run dev.';
    }

    var btn = document.createElement('button');
    btn.textContent = 'Reload';
    btn.setAttribute('data-testid', 'hami-boot-failure-retry');
    btn.style.cssText =
      'margin-top:16px;padding:10px 20px;background:#E6C673;color:#000;border:none;border-radius:8px;font-weight:bold;cursor:pointer;';
    btn.onclick = function () {
      location.reload();
    };

    layer.appendChild(h1);
    layer.appendChild(pre);
    if (hint) layer.appendChild(hint);
    layer.appendChild(btn);

    var onEscape = function (event) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      btn.click();
    };
    window.addEventListener('keydown', onEscape, true);
  }

  function isRecoverableBootError(message) {
    if (!message) return true;
    return (
      /IndexedDB|IDBDatabase|object stores was not found|VersionError|QuotaExceededError/i.test(message) ||
      /ResizeObserver loop/i.test(message) ||
      /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(message) ||
      /Failed to load resource.*favicon/i.test(message) ||
      /useAuth must be used within an AuthProvider/i.test(message) ||
      /useLawyerSettings must be used within LawyerSettingsProvider/i.test(message) ||
      /NetworkError|AbortError|signal is aborted/i.test(message) ||
      /Cannot access .+ before initialization/i.test(message) ||
      /is not defined/i.test(message)
    );
  }

  /**
   * HMR بعد invalidate كثيف قد يترك JSX بمكوّن undefined أو chunk stale.
   * ملاحظة: لا نُعد تحميلاً تلقائياً هنا — كان يسبب حلقة reload عند أخطاء متكررة.
   */
  function tryReloadOnceForHmrGlitch(_message) {
    return false;
  }

  window.removeLoader = function () {
    /* legacy no-op */
  };

  window.onerror = function (msg, url, line, _col, error) {
    var stack = error && error.stack ? String(error.stack) : '';
    var detail = stack
      ? stack
      : [msg, url, line != null ? 'line ' + line : ''].filter(Boolean).join('\n');
    if (tryReloadOnceForHmrGlitch(String(msg))) return true;
    if (isRecoverableBootError(String(msg))) return false;
    showBootFailure('System Error', detail);
    return false;
  };

  window.addEventListener(
    'error',
    function (event) {
      var target = event.target;
      if (target && target.tagName === 'SCRIPT') {
        var src = target.src || 'module script';
        if (/favicon|hami-boot/i.test(src)) return;
        showBootFailure('Failed to load application script', src);
        return;
      }
      if (event.error && event.error.stack) {
        var msg = event.error.message || String(event.message || '');
        if (tryReloadOnceForHmrGlitch(msg)) {
          event.preventDefault();
          return;
        }
        if (isRecoverableBootError(msg)) return;
        showBootFailure('System Error', event.error.stack);
      }
    },
    true,
  );

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var message =
      reason instanceof Error
        ? reason.message || reason.stack || ''
        : typeof reason === 'string'
          ? reason
          : String(reason);
    if (tryReloadOnceForHmrGlitch(message)) {
      event.preventDefault();
      return;
    }
    if (isRecoverableBootError(message)) {
      event.preventDefault();
      return;
    }
    var detail =
      reason instanceof Error
        ? reason.stack || reason.message
        : typeof reason === 'string'
          ? reason
          : JSON.stringify(reason);
    showBootFailure('Application boot failed', detail);
  });
})();
