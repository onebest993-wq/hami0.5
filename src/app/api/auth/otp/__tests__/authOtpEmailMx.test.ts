import { describe, expect, it } from 'vitest';
import { emailDomainAcceptsMail } from '@/app/api/auth/otp/authOtpEmailMx';

describe('emailDomainAcceptsMail', () => {
    it('يقبل مزوّداً معروفاً بلا DNS', async () => {
        await expect(emailDomainAcceptsMail('lawyer@gmail.com')).resolves.toBe(true);
        await expect(emailDomainAcceptsMail('lawyer@proton.me')).resolves.toBe(true);
    });
});
