import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';
import {
    resetPublicVerifiedBadgeStoreForTests,
    writePublicVerifiedBadge,
} from '@/app/services/auth/publicVerifiedBadgeStore';

const UID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('useAccreditedLawyerMark', () => {
    afterEach(() => {
        resetPublicVerifiedBadgeStoreForTests();
    });

    it('لا يعتمد على user_metadata=active', () => {
        const { result } = renderHook(() =>
            useAccreditedLawyerMark(
                'lawyer-guest-1',
                { verificationStatus: 'active' },
                { verification_status: 'active' },
            ),
        );
        expect(result.current).toBe(false);
    });

    it('يعرض العلامة بعد قرار المقر', () => {
        writePublicVerifiedBadge(UID, true);
        const { result } = renderHook(() => useAccreditedLawyerMark(UID));
        expect(result.current).toBe(true);
    });
});
