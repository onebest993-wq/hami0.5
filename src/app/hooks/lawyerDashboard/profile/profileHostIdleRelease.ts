import {
    isProfileShellClosing,
    isProfileShellSnappedOpen,
} from '@/app/services/profile/profileShellSnap';
import { tearDownProfileFloatingState } from '@/app/hooks/lawyerDashboard/profile/profileShellExit';

/**
 * بعد الرجوع للرئيسية تبقى شجرة الملف keep-alive للعودة السريعة.
 * بعد هذه المهلة تُفكَّك — RAM/CPU على الموبايل أثقل من إعادة التركيب عند فتح لاحق.
 * إعادة الفتح خلال المهلة (ومنها E2E) تبقى على الشجرة الدافئة.
 */
export const PROFILE_HOST_IDLE_RELEASE_MS = 12_000;

export function scheduleProfileHostIdleRelease(release: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const timer = window.setTimeout(() => {
        if (isProfileShellSnappedOpen() || isProfileShellClosing()) return;
        tearDownProfileFloatingState();
        release();
    }, PROFILE_HOST_IDLE_RELEASE_MS);
    return () => window.clearTimeout(timer);
}
