/**
 * Android banding/FX overrides — تُحمَّل فقط على Capacitor Android.
 * خارج البرميل sync لـ profilePageFx حتى لا يدفع الويب ~16KB ميتة.
 * يُستدعى مبكراً من shell boot + prime حتى يسبق أول طلاء للملف.
 */
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

let loadPromise: Promise<void> | null = null;

export function ensureProfileAndroidFxLoaded(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (!isAndroidNativeShell()) return Promise.resolve();
    if (!loadPromise) {
        loadPromise = import(
            '@/app/components/lawyer/RoyalLawyerProfile/lawyerProfileFx-android.css'
        ).then(() => undefined);
    }
    return loadPromise;
}

/** تسخين بلا انتظار — آمن من الإقلاع/الهيدر قبل mount */
export function prefetchProfileAndroidFx(): void {
    void ensureProfileAndroidFxLoaded();
}

export function resetProfileAndroidFxLoaderForTests(): void {
    loadPromise = null;
}
