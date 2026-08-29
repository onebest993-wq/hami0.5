import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

/** خروج من التطبيق بعد رفض الشروط — أصلي أولاً، وإلا يبقى الحظر على الشاشة */
export async function exitApplicationAfterTermsDecline(): Promise<void> {
    if (!isCapacitorNativePlatform()) return;
    try {
        const { App } = await import('@capacitor/app');
        await App.exitApp();
    } catch {
        try {
            const { App } = await import('@capacitor/app');
            await App.minimizeApp();
        } catch {
            /* يبقى المستخدم على شاشة الرفض */
        }
    }
}
