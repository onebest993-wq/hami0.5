import { afterEach, describe, expect, it } from 'vitest';
import {
    isLawsuitDecryptBlocked,
    LAWSUIT_DECRYPT_BLOCKED_KEY,
    setLawsuitDecryptBlocked,
} from '../lawsuitDecryptBlockedFlag';

describe('lawsuitDecryptBlockedFlag', () => {
    afterEach(() => {
        sessionStorage.removeItem(LAWSUIT_DECRYPT_BLOCKED_KEY);
    });

    it('يقرأ ويكتب علامة الجلسة بأمان', () => {
        expect(isLawsuitDecryptBlocked()).toBe(false);
        setLawsuitDecryptBlocked(true);
        expect(isLawsuitDecryptBlocked()).toBe(true);
        expect(sessionStorage.getItem(LAWSUIT_DECRYPT_BLOCKED_KEY)).toBe('1');
        setLawsuitDecryptBlocked(false);
        expect(isLawsuitDecryptBlocked()).toBe(false);
    });
});
