/**
 * Hami boot script — externalized for strict CSP (no inline script-src).
 * يُعلن shell-visible فوراً — لا شاشة سوداء.
 */
(function () {
  if (typeof performance !== 'undefined' && performance.mark) {
    try {
      performance.mark('hami:boot:static-shell-visible');
    } catch (e) {
      /* ignore */
    }
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
        modest = true;
      }
      if (modest) document.documentElement.setAttribute('data-hami-lite', '1');
    }

    try {
      var cap = typeof window !== 'undefined' ? window.Capacitor : null;
      if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
        document.documentElement.setAttribute('data-hami-native', '1');
        var plat = typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';
        document.documentElement.setAttribute('data-hami-platform', plat || 'web');
        document.documentElement.classList.add('hami-native-shell');
      } else if (document.documentElement) {
        document.documentElement.setAttribute('data-hami-native', '0');
        document.documentElement.setAttribute('data-hami-platform', 'web');
      }
    } catch (e2) {
      /* ignore */
    }
  } catch (e) {
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

  function showBootFailure(title, detail) {
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

  window.removeLoader = function () {
    /* legacy no-op */
  };

  window.onerror = function (msg, url, line) {
    var detail = [msg, url, line != null ? 'line ' + line : ''].filter(Boolean).join('\n');
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
