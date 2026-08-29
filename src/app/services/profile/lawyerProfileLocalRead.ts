import SecureStoreService from '@/app/services/SecureStoreService';
import { sanitizeLawyerProfile } from '@/app/services/profileSanitizer';
import type { LawyerProfileData } from '@/app/services/cloud/lawyerProfileTypes';
import { getLawyerProfileLocalKey } from '@/app/services/profile/profileLocalKey';
import { peekSecureOrLegacySync } from '@/app/services/storage/readSecureOrDrainLegacySync';

/** المفتاح موجود على القرص وما زال getItemSync فارغاً (فكّ بارد). */
export function isLawyerProfileLocalUnread(userId: string): boolean {
    try {
        const key = getLawyerProfileLocalKey(userId);
        return SecureStoreService.hasItemSync(key) && SecureStoreService.getItemSync(key) === null;
    } catch {
        return false;
    }
}

export function lawyerProfileLocalRecordExists(userId: string): boolean {
    try {
        return SecureStoreService.hasItemSync(getLawyerProfileLocalKey(userId));
    } catch {
        return false;
    }
}

/** قراءة محلية متزامنة — بلا سحابة/ضغط صور/توقيع. لمسار أول طلاء (بلا ترحيل/تشفير). */
export function readLocalProfileSync(userId: string): LawyerProfileData | null {
    try {
        const uid = userId.trim();
        if (!uid || typeof window === 'undefined') return null;
        const raw = peekSecureOrLegacySync(getLawyerProfileLocalKey(uid));
        if (!raw) return null;
        return sanitizeLawyerProfile(JSON.parse(raw) as LawyerProfileData);
    } catch {
        return null;
    }
}
