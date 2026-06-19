/**
 * Application Constants
 * Centralized configuration for magic numbers and common values
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import { debug } from '@/app/utils/debug';

// === TIMING CONSTANTS ===
export const TIMING = {
    /** Debounce delay for search inputs (ms) */
    SEARCH_DEBOUNCE: 300,
    
    /** Short UI transition delay (ms) */
    TRANSITION_SHORT: 300,
    
    /** Medium UI transition delay (ms) */
    TRANSITION_MEDIUM: 500,
    
    /** Long UI transition delay (ms) */
    TRANSITION_LONG: 1500,
    
    /** Animation duration (ms) */
    ANIMATION_DURATION: 3500,
    
    /** Notification polling interval (ms) - 30 seconds */
    NOTIFICATION_POLL: 30000,
    
    /** Voice recording timer interval (ms) */
    RECORDING_TIMER: 1000,
} as const;

// === PERFORMANCE CONSTANTS ===
export const PERFORMANCE = {
    /** Maximum search results to display */
    MAX_SEARCH_RESULTS: 50,
    
    /** Minimum search query length for triggering */
    MIN_SEARCH_LENGTH: 2,
    
    /** Fuse.js search threshold (0-1, lower = more strict) */
    FUSE_THRESHOLD: 0.3,
    
    /** Minimum match character length for Fuse.js */
    FUSE_MIN_MATCH_LENGTH: 2,
} as const;

// === UI CONSTANTS ===
export const UI = {
    /** Toast notification duration (ms) */
    TOAST_DURATION: 3000,
    
    /** Modal animation duration (ms) */
    MODAL_ANIMATION: 200,
    
    /** Maximum file upload size (bytes) - 5MB */
    MAX_FILE_SIZE: 5 * 1024 * 1024,
} as const;

// === LEGAL CONSTANTS ===
export const LEGAL = {
    /** Article numbers in Iraqi Execution Law */
    ARTICLES: {
        ARTICLE_18: 18,
        ARTICLE_20: 20,
        ARTICLE_50: 50,
        ARTICLE_112: 112,
    },
    
    /** Default execution period (days) */
    DEFAULT_EXECUTION_PERIOD: 30,
} as const;

// === STORAGE KEYS ===
export const STORAGE_KEYS = {
    LAWYER_SETTINGS: 'lawyer_settings',
    LAWYER_FILES: 'lawyer_files',
    LAWYER_NOTES: 'lawyer_notes',
    LAWYER_EXECUTION_FILES: 'lawyer_execution_files',
    THEME_PREFERENCE: 'theme_preference',
} as const;

// === CACHE VERSION SYSTEM ===
export const CACHE_VERSION = 'v10.5';
export const CACHE_KEY = 'hami_cache_version';

/**
 * دالة لمسح الذاكرة المؤقتة عند التحديث (مع الحفاظ على بيانات المستخدم)
 * @returns true إذا تم المسح، false إذا لم تكن هناك حاجة
 */
export const clearCacheIfNeeded = (): boolean => {
  const storedVersion = SecureStoreService.getItemSync(CACHE_KEY);
  
  if (storedVersion !== CACHE_VERSION) {
    debug.log(`🔄 [Cache] تحديث من ${storedVersion || 'null'} إلى ${CACHE_VERSION}`);
    
    const volatilePrefixes = ['cache_', 'hami_cache_', 'temp_', 'hami_temp_'];
    const allKeys = SecureStoreService.listKeysSync();
    allKeys.forEach((k) => {
      if (k === CACHE_KEY) return;
      if (volatilePrefixes.some((p) => k.startsWith(p))) {
        try {
          SecureStoreService.deleteItemSync(k);
        } catch {
          /* ignore */
        }
      }
    });

    SecureStoreService.setItemSync(CACHE_KEY, CACHE_VERSION);

    debug.log('✅ [Cache] تم تحديث الذاكرة المؤقتة بنجاح');
    return true;
  }
  
  return false;
};
