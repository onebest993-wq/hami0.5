import { describe, expect, it } from 'vitest';
import {
    adminAccessDeniedBody,
    type AdminAccessDenyInfo,
} from '@/app/components/admin/AdminHeadquartersAccess';

const base: AdminAccessDenyInfo = {
    userId: 'u1',
    userEmail: 'lawyer@example.com',
    isGuest: false,
    verifyReason: 'not_admin',
    profileRole: 'lawyer',
    uuidMatches: false,
    verifyFailed: false,
};

describe('adminAccessDeniedBody', () => {
    it('does not call the master mailbox a different account', () => {
        const body = adminAccessDeniedBody({
            ...base,
            userEmail: 'hami.apps@proton.me',
        });
        expect(body).toContain('حساب المدير المعتمد');
        expect(body).not.toContain('حساب آخر');
    });

    it('explains a failed server verify instead of blaming the mailbox', () => {
        const body = adminAccessDeniedBody({
            ...base,
            userEmail: 'hami.apps@proton.me',
            verifyFailed: true,
        });
        expect(body).toContain('تعذّر التحقق');
        expect(body).not.toContain('حساب آخر');
    });

    it('keeps the switch-account copy for a non-admin session', () => {
        expect(adminAccessDeniedBody(base)).toContain('حساب آخر');
    });
});

describe('بوابة دخول المقر', () => {
    it('لا تعرض عنوان المقر ولا تلميح OTP ولا تلميح الأحرف', async () => {
        const fs = await import('node:fs');
        const path = await import('node:path');
        const gate = fs.readFileSync(
            path.join(process.cwd(), 'src/app/components/admin/AdminHeadquartersAccess.tsx'),
            'utf8',
        );
        expect(gate).toContain('title={null}');
        expect(gate).toContain('hint={null}');
        expect(gate).toContain('showCharsetHint={false}');
        expect(gate).not.toContain('مقر القيادة — دخول المدير');
        expect(gate).not.toContain('بدون تحويل تلقائي');
        const form = fs.readFileSync(
            path.join(process.cwd(), 'src/app/bootstrap/lawyerAuth/LawyerSignInForm.tsx'),
            'utf8',
        );
        expect(form).toContain('showCharsetHint = true');
        expect(form).toContain('بدون تحويل تلقائي');
    });
});
