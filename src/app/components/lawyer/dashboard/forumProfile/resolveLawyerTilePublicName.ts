import { DEV_UNLOCK_LAWYER_NAME } from '@/app/services/auth/devUnlockSession';

export const DEV_UNLOCK_LAWYER_PUBLIC_NAME = 'محامٍ';
export const DEV_UNLOCK_LAWYER_BADGE = 'مطور';

export function isDevUnlockLawyerDisplayName(name: string): boolean {
    return name.trim() === DEV_UNLOCK_LAWYER_NAME;
}

export function resolveLawyerTilePublicName(displayName: string): {
    name: string;
    badge: string | null;
} {
    if (isDevUnlockLawyerDisplayName(displayName)) {
        return { name: DEV_UNLOCK_LAWYER_PUBLIC_NAME, badge: DEV_UNLOCK_LAWYER_BADGE };
    }
    return { name: displayName, badge: null };
}
