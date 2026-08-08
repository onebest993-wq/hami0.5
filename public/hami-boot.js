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

  /** إطار البطاقات الافتراضي من أول بايت — يمنع ظهور الـ rim متأخراً بعد deferred CSS */
  try {
    if (
      document.documentElement &&
      !document.documentElement.getAttribute('data-hami-home-container-border')
    ) {
      document.documentElement.setAttribute('data-hami-home-container-border', '1');
    }
  } catch (_eRimBoot) {
    /* ignore */
  }

  /** تجريبي: ثبّت flags في الذاكرة فقط — لا data-hami-boot-revealed (كان يخفِ الشعار قبل اللوحة) */
  try {
    if (document.documentElement && document.documentElement.getAttribute('data-hami-demo-boot') === '1') {
      window.__hamiBootRevealDone__ = true;
    }
  } catch (_eDemoInstant) {
    /* ignore */
  }

    /** إن اكتمل الإقلاع في الجلسة — علم الذاكرة فقط؛ الشعار يُزال بعد paint اللوحة */
    try {
        var bootDone =
            sessionStorage.getItem('hami_boot_complete') === '1' ||
            sessionStorage.getItem('hami_splash_executed') === '1';
        if (bootDone) {
            window.__hamiBootRevealDone__ = true;
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
        if (plat === 'android') {
          document.documentElement.style.setProperty('--hami-android-status-pad', '12px');
        }
        /* نص الإقلاع يبقى في #hami-static-boot حتى جاهزية اللوحة — بلا تخطي مبكر */
      } else if (
        !alreadyNative &&
        /Android/i.test(ua) &&
        (/;\s*wv\)/i.test(ua) || /Capacitor/i.test(ua))
      ) {
        document.documentElement.setAttribute('data-hami-native', '1');
        document.documentElement.setAttribute('data-hami-platform', 'android');
        document.documentElement.classList.add('hami-native-shell');
        document.documentElement.style.setProperty('--hami-android-status-pad', '12px');
      } else if (!alreadyNative && document.documentElement) {
        document.documentElement.setAttribute('data-hami-native', '0');
        document.documentElement.setAttribute('data-hami-platform', 'web');
      }
    } catch (_e2) {
      /* ignore */
    }

    /** لقطة ألوان الجلسة السابقة — قبل CSS/React */
    try {
      if (document.documentElement) {
        var paintRaw = null;
        try {
          paintRaw = sessionStorage.getItem('hami_boot_surface_paint_session_v1');
        } catch (_eSess) {
          /* ignore */
        }
        if (!paintRaw && typeof localStorage !== 'undefined') {
          paintRaw = localStorage.getItem('hami_boot_surface_paint_v1');
        }
        if (paintRaw) {
          var paint = JSON.parse(paintRaw);
          if (paint && paint.v === 1 && paint.boardBg && paint.surfaceBg && paint.primary) {
            var root = document.documentElement;
            root.style.setProperty('--hami-primary', paint.primary);
            root.style.setProperty('--hami-secondary', paint.secondary || paint.primary);
            root.style.setProperty('--hami-surface-bg', paint.surfaceBg);
            root.style.setProperty('--hami-board-surface-bg', paint.boardBg);
            if (paint.cardBg) root.style.setProperty('--hami-card-surface-bg', paint.cardBg);
            if (paint.glassBase) root.style.setProperty('--hami-glass-base', paint.glassBase);
            if (paint.glassOpacity) root.style.setProperty('--glass-opacity', paint.glassOpacity);
            if (paint.theme) root.setAttribute('data-hami-theme', paint.theme);
            root.setAttribute('data-hami-wallpaper', paint.wallpaper === '1' ? '1' : '0');
            var bootPaint = paint.boardBg || paint.surfaceBg || '#0a0f1c';
            root.style.backgroundColor = bootPaint;
            if (document.body) document.body.style.backgroundColor = bootPaint;
            if (paint.wallpaper === '1' && typeof localStorage !== 'undefined') {
              var cachedWp = localStorage.getItem('lawyer_wallpaper');
              if (cachedWp && cachedWp.indexOf('data:') === 0) {
                root.style.setProperty(
                  '--hami-wallpaper-image',
                  'url("' +
                    cachedWp.replace(/\\/g, '\\\\').replace(/"/g, '\\"') +
                    '")',
                );
              }
            }
          }
        }
      }
    } catch (_ePaint) {
      /* ignore */
    }

    /** خلفية مخزّنة قديمة — أول إطار قبل React/SecureStore */
    try {
      if (typeof localStorage !== 'undefined' && document.documentElement) {
        var legacyWp = localStorage.getItem('lawyer_wallpaper');
        if (legacyWp && legacyWp.indexOf('data:') === 0) {
          document.documentElement.setAttribute('data-hami-wallpaper', '1');
          document.documentElement.style.setProperty(
            '--hami-wallpaper-image',
            'url("' +
              legacyWp.replace(/\\/g, '\\\\').replace(/"/g, '\\"') +
              '")',
          );
        }
      }
    } catch (_eWp) {
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

  function isNativeShell() {
    try {
      var cap = typeof window !== 'undefined' ? window.Capacitor : null;
      if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return true;
      if (document.documentElement && document.documentElement.getAttribute('data-hami-native') === '1') {
        return true;
      }
    } catch (_eNative) {
      /* ignore */
    }
    return false;
  }

  function bootGuardTimeoutMs() {
    try {
      var root = document.documentElement;
      var custom = root && root.getAttribute('data-hami-boot-guard-ms');
      if (custom) {
        var parsed = parseInt(custom, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (root && root.getAttribute('data-hami-demo-boot') === '1') {
        return 4000;
      }
      if (isNativeShell()) return 22000;
    } catch (_eTimeout) {
      /* ignore */
    }
    return 14000;
  }

  function bootGuardFailureDetail() {
    if (isNativeShell()) {
      return (
        'لم يكتمل تحميل التطبيق على الجهاز خلال المهلة.\n\n' +
        'السبب الأكثر شيوعاً: البناء بدون مفاتيح Supabase.\n\n' +
        'من الحاسوب نفّذ:\n' +
        '  npm run cap:build:android\n' +
        'ثم أعد التشغيل من Android Studio.\n\n' +
        'أو أنشئ ملف .env.production.local وضع فيه:\n' +
        '  VITE_SUPABASE_URL\n' +
        '  VITE_SUPABASE_ANON_KEY\n' +
        '  VITE_SHELL_AUTH_OPEN=true'
      );
    }
    return (
      'لم يكتمل تحميل التطبيق خلال المهلة.\n\n' +
      'تحقّق من متغيرات Vercel عند البناء:\n' +
      '  VITE_SUPABASE_URL\n' +
      '  VITE_SUPABASE_ANON_KEY\n' +
      'ثم أعد النشر (Redeploy).\n\n' +
      'في DevTools → Network تأكّد أن /assets/*.js يُرجع JavaScript وليس index.html.'
    );
  }

  /**
   * حارس أخير: إن بقي #hami-static-boot دون جاهزية React — لا تعليق صامت على Vercel/الإنتاج.
   */
  window.setTimeout(function () {
    var shell = document.getElementById('hami-static-boot');
    if (!shell || !shell.parentNode) return;
    try {
      if (window.__hamiBootRevealDone__ === true) return;
      if (document.documentElement && document.documentElement.dataset.hamiAppRuntimeReady === '1') return;
      if (sessionStorage.getItem('hami_boot_complete') === '1') return;
    } catch (_eGuard) {
      /* ignore */
    }
    showBootFailure('تعذّر إكمال الإقلاع', bootGuardFailureDetail());
    try {
      shell.parentNode.removeChild(shell);
      document.documentElement.classList.remove('hami-boot-static-active');
    } catch (_eRm) {
      /* ignore */
    }
  }, bootGuardTimeoutMs());

  function isRecoverableBootError(message) {
    if (!message) return true;
    if (/PrivacyScreen(\.\w+)?\(\) is not implemented/i.test(message)) {
      try {
        if (document.documentElement && document.documentElement.dataset.hamiCapacitorBoot !== '1') {
          return true;
        }
      } catch (_eCap) {
        return true;
      }
    }
    if (/BiometricAuth(Native)?(\.\w+)?\(\) is not implemented/i.test(message)) {
      return true;
    }
    if (/BiometricAuthNative\.then\(\)/i.test(message)) {
      return true;
    }
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

  /** استئناف فوري — قبل React/Capacitor: أزل درع الخصوصية والسواد */
  function dismissBootPrivacyShieldEarly() {
    try {
      var shield = document.getElementById('hami-privacy-blur-shield');
      if (shield) {
        shield.style.opacity = '0';
        shield.style.visibility = 'hidden';
        shield.style.pointerEvents = 'none';
      }
      if (document.body) document.body.style.filter = 'none';
      delete document.documentElement.dataset.hamiPrivacyShield;
    } catch (_eShield) {
      /* ignore */
    }
  }

  function onForegroundEarly() {
    if (document.hidden) return;
    dismissBootPrivacyShieldEarly();
    try {
      document.documentElement.dataset.hamiAppActive = '1';
    } catch (_eActive) {
      /* ignore */
    }
  }

  document.addEventListener('visibilitychange', onForegroundEarly);
  window.addEventListener('pageshow', onForegroundEarly);

  /** طبقة 2: انتقال شاشة الإقلاع → هيكل المنزل الثابت */
  function isWarmBootSessionLocal() {
    try {
      return (
        sessionStorage.getItem('hami_boot_complete') === '1' ||
        sessionStorage.getItem('hami_splash_executed') === '1'
      );
    } catch (_eWarm) {
      return false;
    }
  }

  function revealHomeStaticShell() {
    /* مقاييس فقط — لا نُخفِ الشعار ولا نُظهر shell صلب (كان يُنتج شاشة فارغة بنفس لون الخلفية) */
    try {
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('hami:boot:home-static-shell-painted');
      }
      window.dispatchEvent(new Event('hami:home-static-shell-painted'));
    } catch (_eShellPaint) {
      /* ignore */
    }
  }

  function scheduleSplashToShellHandoff() {
    /* شاشة واحدة: الشعار يبقى معتماً حتى يزيل React #hami-static-boot — بلا fade لطبقة shell */
    try {
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark('hami:boot:splash-held-until-handoff');
      }
    } catch (_eHold) {
      /* ignore */
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleSplashToShellHandoff);
  } else {
    scheduleSplashToShellHandoff();
  }
})();
