import { afterEach, describe, expect, it } from 'vitest';
import {
    clearRegistrationReviewHold,
    markRegistrationReviewHold,
    readRegistrationReviewHold,
} from '@/app/services/auth/registrationReviewHold';

describe('registrationReviewHold', () => {
    afterEach(() => {
        clearRegistrationReviewHold();
    });

    it('يحفظ ويُزيل إشارة انتظار الاعتماد', () => {
        expect(readRegistrationReviewHold()).toBeNull();
        markRegistrationReviewHold(true);
        expect(readRegistrationReviewHold()?.emailConfirmRequired).toBe(true);
        clearRegistrationReviewHold();
        expect(readRegistrationReviewHold()).toBeNull();
    });
});
