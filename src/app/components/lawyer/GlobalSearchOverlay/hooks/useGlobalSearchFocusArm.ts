/**
 * على الموبايل الأصلي: لا autofocus تلقائي — المستخدم ينقر الحقل (يمنع حرب الكيبورد).
 * على الويب: جاهز فور الفتح.
 */
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export function useGlobalSearchFocusArm(open: boolean): boolean {
    if (!open) return false;
    return !isCapacitorNativePlatform();
}
