import { whenNativeBridgeReady } from '@/app/runtime/nativeBridgeReady';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { callPrivacyScreenGuard } from '@/app/runtime/privacyScreenNative';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { HamiPrivacy } from '@/plugins/hami-privacy-guard';

export type NativePrivacyGuardState = {
    recentsCover: boolean;
    windowSecure: boolean;
};

function resolveGuardFromSettings(security?: {
    privacyBlur: boolean;
    screenshotDeterrent: boolean;
}): NativePrivacyGuardState {
    const snap = security ?? getLawyerSettingsSnapshot().security;
    return {
        recentsCover: snap.privacyBlur,
        windowSecure: snap.privacyBlur || snap.screenshotDeterrent,
    };
}

async function invokeHamiPrivacy(state: NativePrivacyGuardState): Promise<boolean> {
    try {
        const { Capacitor } = await import('@capacitor/core');
        if (!Capacitor.isPluginAvailable('HamiPrivacy')) return false;
        await HamiPrivacy.setGuard(state);
        return true;
    } catch {
        return false;
    }
}

/**
 * طبقة النافذة الأصلية: غطاء شاشة المهام + FLAG_SECURE.
 * HamiPrivacy هو المصدر؛ PrivacyScreen المجتمع يُزامَن معه حتى لا يُلغى العلم.
 */
export async function applyNativePrivacyGuard(state: NativePrivacyGuardState): Promise<boolean> {
    if (!isCapacitorNativePlatform()) return true;

    try {
        await whenNativeBridgeReady();
        const hamiOk = await invokeHamiPrivacy(state);
        if (hamiOk) {
            void callPrivacyScreenGuard(state.windowSecure);
            return true;
        }
        return callPrivacyScreenGuard(state.windowSecure);
    } catch {
        return false;
    }
}

export async function syncNativePrivacyGuardFromSettings(security?: {
    privacyBlur: boolean;
    screenshotDeterrent: boolean;
}): Promise<boolean> {
    return applyNativePrivacyGuard(resolveGuardFromSettings(security));
}
