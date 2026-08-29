/**
 * Production Utilities - أدوات البيئة الإنتاجية
 * 
 * المسؤوليات:
 * - التحقق من بيئة التشغيل
 * - تعطيل كود Debug في Production
 * - تحسين الأداء
 * 
 * @version 1.0.0
 * @date 2026-03-17
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import { debug } from '@/app/utils/debug';

// =====================================================
// Environment Detection
// =====================================================

/**
 * التحقق من بيئة التطوير
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

/**
 * التحقق من بيئة الإنتاج
 */
export const isProduction = (): boolean => {
  return import.meta.env.PROD === true;
};

/**
 * الحصول على اسم البيئة
 */
export const getEnvironment = (): 'development' | 'production' | 'test' => {
  if (import.meta.env.DEV) return 'development';
  if (import.meta.env.PROD) return 'production';
  return 'test';
};

// =====================================================
// Console Management
// =====================================================

/**
 * تعطيل console.log في الإنتاج
 */
export const disableConsoleInProduction = (): void => {
  if (isProduction()) {
    // ✅ حفظ الدوال الأصلية للاستخدام الداخلي
    const originalConsole = {
      log: console.log,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
    };

    // ✅ تعطيل console.log و console.info و console.debug
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    
    // ✅ الإبقاء على console.error و console.warn للأخطاء الحرجة
    // (لكن بدون معلومات حساسة)
    console.warn = (...args: any[]) => {
      // تصفية المعلومات الحساسة
      const sanitized = args.map(arg => 
        typeof arg === 'object' ? '[Object]' : arg
      );
      originalConsole.warn(...sanitized);
    };

    console.error = (...args: any[]) => {
      // تصفية المعلومات الحساسة
      const sanitized = args.map(arg => 
        typeof arg === 'object' ? '[Object]' : arg
      );
      originalConsole.warn('Error:', ...sanitized);
    };
  }
};

// =====================================================
// Performance Optimization
// =====================================================

/**
 * تحسين الأداء في الإنتاج
 */
export const optimizeForProduction = (): void => {
  if (isProduction()) {
    // ✅ تعطيل React DevTools في الإنتاج
    if (typeof window !== 'undefined') {
      (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        isDisabled: true,
        supportsFiber: true,
        inject: () => {},
        onCommitFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
      };
    }

    // ✅ تنظيف localStorage من البيانات القديمة
    try {
      const keysToClean = ['debug_logs', 'dev_cache', 'test_data'];
      keysToClean.forEach((key) => SecureStoreService.deleteItemSync(key));
    } catch (error) {
      // Silent fail
    }
  }
};

// =====================================================
// API Key Validation
// =====================================================

/**
 * التحقق من وجود مفاتيح API الضرورية.
 * يرفض الـplaceholders أيضاً — قيمة مثل YOUR_PROJECT ليست «موجودة».
 */
export const validateRequiredAPIs = (): {
  valid: boolean;
  missing: string[];
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];

  const url = typeof import.meta.env.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL.trim() : '';
  const anon =
    typeof import.meta.env.VITE_SUPABASE_ANON_KEY === 'string'
      ? import.meta.env.VITE_SUPABASE_ANON_KEY.trim()
      : '';
  const looksPlaceholder = (v: string) => !v || /YOUR_PROJECT|eyJ\.\.\.|CHANGE_ME|placeholder/i.test(v);

  if (looksPlaceholder(url)) missing.push('VITE_SUPABASE_URL');
  if (looksPlaceholder(anon) || anon.length <= 20) missing.push('VITE_SUPABASE_ANON_KEY');

  const optional = {
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  };

  Object.entries(optional).forEach(([key, value]) => {
    if (!value || value === '') {
      warnings.push(`${key} غير مُفعّل — المراقبة الاختيارية متوقفة`);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
};

// =====================================================
// Initialization
// =====================================================

/**
 * تهيئة البيئة الإنتاجية
 */
export const initializeProduction = (): void => {
  if (isProduction()) {
    disableConsoleInProduction();
    optimizeForProduction();

    // عقد العميل الحقيقي يُفرض عند تحميل lib/supabase عبر clientEnv (fail-closed).
    // هنا نبقي تحذيراً مبكراً للمفاتيح الاختيارية فقط — لا نسكت على غيابها.
    const apiCheck = validateRequiredAPIs();
    if (!apiCheck.valid) {
      // لا نرمي هنا: الإقلاع يكون قد فشل أصلاً إن وصل createClient بلا قيم.
      // إن وصلنا رغم النقص فذلك يعني مسار DEV/test — نسجّل فقط.
      console.error('[production] client env incomplete:', apiCheck.missing);
    }
    if (apiCheck.warnings.length > 0) {
      apiCheck.warnings.forEach((warning) => console.warn(warning));
    }
  }
};

// =====================================================
// Feature Flags
// =====================================================

/**
 * التحقق من تفعيل ميزة معينة
 */
export const isFeatureEnabled = (feature: string): boolean => {
  // ✅ في التطوير: كل الميزات مفعلة
  if (isDevelopment()) {
    return true;
  }

  // ✅ في الإنتاج: التحقق من Environment Variables
  const featureKey = `VITE_FEATURE_${feature.toUpperCase()}`;
  return import.meta.env[featureKey] === 'true';
};

// =====================================================
// Debug Mode
// =====================================================

/**
 * التحقق من تفعيل وضع Debug
 */
export const isDebugMode = (): boolean => {
  // ✅ في التطوير: دائماً true
  if (isDevelopment()) {
    return true;
  }

  // ✅ في الإنتاج: التحقق من localStorage
  try {
    return SecureStoreService.getItemSync('debug_mode') === 'true';
  } catch {
    return false;
  }
};

/**
 * تفعيل/تعطيل وضع Debug
 */
export const setDebugMode = (enabled: boolean): void => {
  try {
    if (enabled) {
      SecureStoreService.setItemSync('debug_mode', 'true');
      console.log('✅ تم تفعيل وضع Debug');
    } else {
      SecureStoreService.deleteItemSync('debug_mode');
      console.log('✅ تم تعطيل وضع Debug');
    }
  } catch (error) {
    console.error('فشل تغيير وضع Debug:', error);
  }
};

// =====================================================
// Build Info
// =====================================================

/**
 * معلومات البناء
 */
export const getBuildInfo = (): {
  version: string;
  buildId: string;
  release: string;
  environment: string;
  buildDate: string;
} => {
  return {
    version: __HAMI_APP_VERSION__,
    buildId: __HAMI_BUILD_ID__,
    release: __HAMI_APP_RELEASE__,
    environment: getEnvironment(),
    // وقت البناء لا وقت الاستدعاء — كان `new Date()` يعيد «الآن» تحت اسم تاريخ بناء
    buildDate: __HAMI_BUILD_TIME__,
  };
};

/**
 * طباعة معلومات البناء
 */
export const logBuildInfo = (): void => {
  if (!import.meta.env.DEV) return;
  const info = getBuildInfo();
  debug.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📱 نظام ملف الدعوى الذكي - حامي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    الإصدار: ${info.version}
    البيئة: ${info.environment}
    التاريخ: ${info.buildDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
};
