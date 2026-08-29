import { useEffect, useState } from 'react';
import {
    peekPublicVerifiedBadge,
    requestPublicVerifiedBadge,
    subscribePublicVerifiedBadge,
} from '@/app/services/auth/publicVerifiedBadgeStore';

/**
 * علامة التوثيق العامة على الصورة — مصدرها المقر (profiles.public_verified_badge)،
 * ليست اعتماد الهوية ولا JWT للمستخدم.
 */
export function useAccreditedLawyerMark(
    userId?: string | null,
    _userMetadata?: Record<string, unknown> | null,
    _appMetadata?: Record<string, unknown> | null,
): boolean {
    const id = String(userId ?? '').trim();
    const [, setEpoch] = useState(0);
    useEffect(() => subscribePublicVerifiedBadge(() => setEpoch((n) => n + 1)), []);
    useEffect(() => {
        requestPublicVerifiedBadge(id);
    }, [id]);
    return peekPublicVerifiedBadge(id);
}
