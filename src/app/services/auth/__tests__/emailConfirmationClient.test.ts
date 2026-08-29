import { afterEach, describe, expect, it } from 'vitest';

import {
    clearEmailConfirmationPending,
    isEmailConfirmationErrorMessage,
    markEmailConfirmationPending,
    readEmailConfirmationPending,
} from '@/app/services/auth/emailConfirmationClient';

describe('emailConfirmationClient', () => {
    afterEach(() => {
        clearEmailConfirmationPending();
        sessionStorage.clear();
    });

    it('stores and reads a pending confirmation mailbox', () => {
        markEmailConfirmationPending('Lawyer@Gmail.com');
        expect(readEmailConfirmationPending()).toBe('lawyer@gmail.com');
        clearEmailConfirmationPending();
        expect(readEmailConfirmationPending()).toBeNull();
    });

    it('detects GoTrue and Arabic confirmation errors', () => {
        expect(isEmailConfirmationErrorMessage('Email not confirmed')).toBe(true);
        expect(isEmailConfirmationErrorMessage('يرجى تأكيد البريد الإلكتروني من الرسالة')).toBe(true);
        expect(isEmailConfirmationErrorMessage('Invalid credentials')).toBe(false);
    });
});
