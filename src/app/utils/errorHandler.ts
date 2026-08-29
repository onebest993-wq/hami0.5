// 🚨 ERROR HANDLER UTILITY

import { SmartToast } from '@/app/components/ui/SmartToast';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { logError, logErrorWithContext as logErrorCore } from '@/app/utils/errorLog';

export { logError };

export function logErrorWithContext(
    context: string,
    error: unknown,
    additionalInfo?: Record<string, unknown>,
): void {
    logErrorCore(context, error, additionalInfo);
    if (typeof window !== 'undefined' && (window as { Sentry?: { captureException: (e: unknown, ctx: unknown) => void } }).Sentry) {
        try {
            (window as { Sentry: { captureException: (e: unknown, ctx: unknown) => void } }).Sentry.captureException(
                error,
                { tags: { context }, extra: additionalInfo },
            );
        } catch (e) {
            console.debug('[ErrorHandler] فشل إرسال الخطأ إلى Sentry:', e);
        }
    }
}

/**
 * Safe async handler wrapper
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    errorMessage?: string
): Promise<{ data: T | null; error: Error | null }> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (errorMessage) {
            console.error(`❌ ${errorMessage}:`, err);
        } else {
            console.error('❌ خطأ:', err);
        }
        return { data: null, error: err };
    }
}

/**
 * Safe sync handler wrapper
 */
export function safeSync<T>(
    fn: () => T,
    errorMessage?: string
): { data: T | null; error: Error | null } {
    try {
        const data = fn();
        return { data, error: null };
    } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        if (errorMessage) {
            console.error(`❌ ${errorMessage}:`, err);
        } else {
            console.error('❌ خطأ:', err);
        }
        return { data: null, error: err };
    }
}

/**
 * Create error with context
 */
export function createError(message: string, context?: string): Error {
    const fullMessage = context ? `[${context}] ${message}` : message;
    return new Error(fullMessage);
}

/**
 * Check if error is specific type
 */
export function isQuotaError(error: unknown): boolean {
    return error instanceof Error && error.name === 'QuotaExceededError';
}

export function isNetworkError(error: unknown): boolean {
    return error instanceof Error && 
           (error.message.includes('network') || 
            error.message.includes('fetch') ||
            error.message.includes('Failed to fetch'));
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error('Unknown error');
            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error('Retry failed');
}

/**
 * 🆕 V10.5: Handle async errors with Toast notification
 */
export async function handleAsyncError<T>(
  fn: () => Promise<T>,
  errorMessage: string,
  showToast: boolean = true
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    logErrorWithContext('AsyncError', error, { errorMessage });
    
    if (showToast) {
      SmartToast.error(errorMessage);
    }
    
    return null;
  }
}

/**
 * 🆕 V10.5: Validate and handle LocalStorage operations
 */
export function safeLocalStorage(operation: 'get' | 'set' | 'remove', key: string, value?: any): any {
  try {
    switch (operation) {
      case 'get':
        const item = readSecureOrDrainLegacySync(key);
        return item ? JSON.parse(item) : null;
      
      case 'set':
        writeSecureAndClearLegacySync(key, JSON.stringify(value));
        return true;
      
      case 'remove':
        SecureStoreService.deleteItemSync(key);
        clearLegacyPlaintextMirror(key);
        return true;
      
      default:
        return null;
    }
  } catch (error) {
    if (isQuotaError(error)) {
      console.error('❌ [LocalStorage] الذاكرة ممتلئة - يرجى مسح بعض البيانات');
      
      // محاولة مسح البيانات القديمة
      try {
        const keys = SecureStoreService.listKeysSync();
        const oldKeys = keys.filter(k => k.includes('_old') || k.includes('_cache'));
        oldKeys.forEach((k) => SecureStoreService.deleteItemSync(k));
        
        // إعادة المحاولة
        if (operation === 'set') {
          writeSecureAndClearLegacySync(key, JSON.stringify(value));
          return true;
        }
      } catch (retryError) {
        console.error('❌ [LocalStorage] فشلت إعادة المحاولة:', retryError);
      }
    }
    
    logErrorWithContext('LocalStorage', error, { operation, key });
    return null;
  }
}