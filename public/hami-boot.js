/**
 * Hami boot script — externalized for strict CSP (no inline script-src).
 */
(function () {
  function showBootFailure(title, detail) {
    var loader = document.getElementById('loading-overlay');
    if (!loader) return;
    loader.style.opacity = '1';
    loader.style.pointerEvents = 'auto';
    while (loader.firstChild) loader.removeChild(loader.firstChild);

    var h1 = document.createElement('h1');
    h1.style.cssText = 'color:#ff4444;margin:0 0 12px;font-family:monospace;font-size:18px;';
    h1.textContent = title || 'System Error';

    var pre = document.createElement('pre');
    pre.style.cssText =
      'color:#fff;text-align:left;background:#111;padding:12px;border-radius:8px;max-width:92vw;overflow:auto;direction:ltr;font-size:12px;border:1px solid #333;white-space:pre-wrap;';
    pre.textContent = detail || 'Unknown boot error';

    var btn = document.createElement('button');
    btn.textContent = 'Reload';
    btn.style.cssText =
      'margin-top:16px;padding:10px 20px;background:#E6C673;color:#000;border:none;border-radius:8px;font-weight:bold;cursor:pointer;';
    btn.onclick = function () {
      location.reload();
    };

    loader.appendChild(h1);
    loader.appendChild(pre);
    loader.appendChild(btn);
  }

  window.removeLoader = function () {
    var loader = document.getElementById('loading-overlay');
    if (loader) {
      loader.style.opacity = '0';
      setTimeout(function () {
        loader.remove();
      }, 500);
    }
  };

  window.onerror = function (msg, url, line) {
    var detail = [msg, url, line != null ? 'line ' + line : ''].filter(Boolean).join('\n');
    showBootFailure('System Error', detail);
    return false;
  };

  window.addEventListener(
    'error',
    function (event) {
      var target = event.target;
      if (target && target.tagName === 'SCRIPT') {
        var src = target.src || 'module script';
        showBootFailure('Failed to load application script', src);
      }
    },
    true,
  );

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    var detail =
      reason instanceof Error
        ? reason.stack || reason.message
        : typeof reason === 'string'
          ? reason
          : JSON.stringify(reason);
    showBootFailure('Application boot failed', detail);
  });

  window.addEventListener('pageshow', function () {
    if (typeof window.removeLoader === 'function') window.removeLoader();
  });

  setTimeout(function () {
    var loader = document.getElementById('loading-overlay');
    if (!loader || !loader.parentNode) return;
    var stillLoading = loader.querySelector('p');
    if (stillLoading && /Loading System/i.test(stillLoading.textContent || '')) {
      showBootFailure(
        'Loading timeout',
        'The app bundle did not start in time. Redeploy the latest build or hard-refresh (Ctrl+Shift+R).',
      );
    }
  }, 15000);
})();
