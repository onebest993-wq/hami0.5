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
// Error Reporting
// =====================================================

/**
 * معالجة الأخطاء في الإنتاج
 */
export const handleProductionError = (error: Error, context?: string): void => {
  if (isProduction()) {
    // ✅ في الإنتاج: تسجيل الخطأ بدون تفاصيل حساسة
    console.error('Application Error', context || 'Unknown');
    
    // ✅ يمكن إضافة خدمة تتبع الأخطاء هنا (مثل Sentry)
    // مثال: Sentry.captureException(error);
  } else {
    // ✅ في التطوير: عرض التفاصيل كاملة
    console.error('Error:', error, '\nContext:', context);
  }
};

// =====================================================
// API Key Validation
// =====================================================

/**
 * التحقق من وجود مفاتيح API الضرورية
 */
export const validateRequiredAPIs = (): { 
  valid: boolean; 
  missing: string[]; 
  warnings: string[];
} => {
  const missing: string[] = [];
  const warnings: string[] = [];

  // ✅ مفاتيح مطلوبة
  const required = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };

  // ✅ مفاتيح اختيارية (تحذيرات فقط)
  const optional = {
    PINECONE_API_KEY: import.meta.env.VITE_PINECONE_API_KEY,
    TWILIO_ACCOUNT_SID: import.meta.env.VITE_TWILIO_ACCOUNT_SID,
  };

  // ✅ فحص المفاتيح المطلوبة
  Object.entries(required).forEach(([key, value]) => {
    if (!value || value === '') {
      missing.push(key);
    }
  });

  // ✅ فحص المفاتيح الاختيارية
  Object.entries(optional).forEach(([key, value]) => {
    if (!value || value === '') {
      warnings.push(`${key} غير مُفعّل - سيعمل التطبيق في وضع Mock`);
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
    console.log('🚀 التطبيق يعمل في بيئة الإنتاج');
    
    // ✅ تعطيل console logs
    disableConsoleInProduction();
    
    // ✅ تحسين الأداء
    optimizeForProduction();
    
    // ✅ التحقق من APIs
    const apiCheck = validateRequiredAPIs();
    
    if (!apiCheck.valid) {
      console.error('تحذير: مفاتيح API مفقودة:', apiCheck.missing);
    }
    
    if (apiCheck.warnings.length > 0) {
      apiCheck.warnings.forEach(warning => console.warn(warning));
    }
    
    console.log('✅ تم تهيئة البيئة الإنتاجية بنجاح');
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
  environment: string;
  buildDate: string;
} => {
  return {
    version: '10.5.0',
    environment: getEnvironment(),
    buildDate: new Date().toISOString(),
  };
};

/**
 * طباعة معلومات البناء
 */
export const logBuildInfo = (): void => {
  const info = getBuildInfo();
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    📱 نظام ملف الدعوى الذكي - حامي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    الإصدار: ${info.version}
    البيئة: ${info.environment}
    التاريخ: ${info.buildDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
};
