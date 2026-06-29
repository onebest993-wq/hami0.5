import { useCallback } from 'react';
import { shareNative } from '@/app/services/platform/nativeShare';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    buildProfileShareText,
    type BuildProfileShareTextInput,
} from '@/app/services/profile/profileShareText';

export type UseProfileShareArgs = BuildProfileShareTextInput;

export function useProfileShare({
    displayName,
    title,
    ownerAuthEmail,
    phone,
    city,
    isOwner,
    privacy,
    visibleActions,
}: UseProfileShareArgs) {
    const shareProfile = useCallback(async () => {
        const text = buildProfileShareText({
            displayName,
            title,
            ownerAuthEmail,
            phone,
            city,
            isOwner,
            privacy,
            visibleActions,
        });
        if (!text.trim()) {
            SmartToast.info('لا بيانات عامة للمشاركة');
            return;
        }

        const result = await shareNative({
            title: displayName.trim() || 'الملف المهني',
            text,
            dialogTitle: 'مشاركة الملف المهني',
        });

        if (result === 'copied') {
            SmartToast.success('تم نسخ بطاقة التعريف');
        } else if (result === 'cancelled') {
            SmartToast.info('لم يتم المشاركة');
        } else if (result === 'unavailable') {
            SmartToast.error('المشاركة غير متاحة على هذا الجهاز');
        }
    }, [city, displayName, isOwner, ownerAuthEmail, phone, privacy, title, visibleActions]);

    return { shareProfile };
}
