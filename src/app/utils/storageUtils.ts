// 🔒 SAFE LOCALSTORAGE WRAPPER - مع error handling
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';

/**
 * Safe localStorage setItem with error handling
 */
export function safeSetItem(key: string, value: any): boolean {
    try {
        const serialized = JSON.stringify(value);
        writeSecureAndClearLegacySync(key, serialized);
        return true;
    } catch (error) {
        if (error instanceof Error) {
            // QuotaExceededError
            if (error.name === 'QuotaExceededError') {
                console.error('❌ LocalStorage ممتلئ! لا يمكن الحفظ.', error);
            } else {
                console.error('❌ خطأ في حفظ البيانات:', error.message);
            }
        }
        return false;
    }
}

/**
 * Safe localStorage getItem with error handling
 */
export function safeGetItem<T>(key: string, defaultValue: T | null = null): T | null {
    try {
        const item = readSecureOrDrainLegacySync(key);
        if (item === null) return defaultValue;
        return JSON.parse(item) as T;
    } catch (error) {
        console.error(`❌ خطأ في قراءة البيانات من ${key}:`, error);
        return defaultValue;
    }
}

/**
 * Safe localStorage removeItem
 */
export function safeRemoveItem(key: string): boolean {
    try {
        SecureStoreService.deleteItemSync(key);
        clearLegacyPlaintextMirror(key);
        return true;
    } catch (error) {
        console.error(`❌ خطأ في حذف ${key}:`, error);
        return false;
    }
}

/**
 * Safe localStorage clear
 */
export function safeClear(): boolean {
    try {
        const keys = SecureStoreService.listKeysSync();
        keys.forEach((k) => {
            SecureStoreService.deleteItemSync(k);
            clearLegacyPlaintextMirror(k);
        });
        return true;
    } catch (error) {
        console.error('❌ خطأ في مسح التخزين:', error);
        return false;
    }
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
    try {
        const test = '__localStorage_test__';
        SecureStoreService.setItemSync(test, test);
        SecureStoreService.deleteItemSync(test);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get localStorage size in MB
 */
export function getStorageSize(): number {
    try {
        let total = 0;
        const keys = SecureStoreService.listKeysSync();
        keys.forEach((key) => {
            const value = SecureStoreService.getItemSync(key);
            total += (value?.length ?? 0) + key.length;
        });
        return (total / 1024 / 1024); // Convert to MB
    } catch {
        return 0;
    }
}

/**
 * Safe batch update - multiple keys at once
 */
export function safeBatchSet(items: Record<string, any>): boolean {
    try {
        for (const [key, value] of Object.entries(items)) {
            const serialized = JSON.stringify(value);
            writeSecureAndClearLegacySync(key, serialized);
        }
        return true;
    } catch (error) {
        console.error('❌ خطأ في الحفظ المجمّع:', error);
        return false;
    }
}
