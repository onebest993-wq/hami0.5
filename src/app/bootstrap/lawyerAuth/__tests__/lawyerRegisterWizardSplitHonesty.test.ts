import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = resolve(process.cwd(), 'src/app/bootstrap/lawyerAuth');

describe('lawyer register wizard file split', () => {
    it('المعالج يركّب الخطوات؛ الحقول في ملفات الخطوة', () => {
        const wizard = readFileSync(resolve(dir, 'LawyerRegisterWizard.tsx'), 'utf8');
        expect(wizard).toContain('LawyerRegisterCredentialsStep');
        expect(wizard).toContain('LawyerRegisterProfileStep');
        const profileStep = readFileSync(resolve(dir, 'LawyerRegisterProfileStep.tsx'), 'utf8');
        expect(profileStep).toContain('lawyer-register-fullname-note');
        expect(profileStep).toContain('DISPLAY_NAME_REGISTER_NOTE');
        expect(wizard).toContain('LawyerRegisterIdentityStep');
        expect(wizard).toContain('LawyerRegisterFaceStep');
        expect(wizard).toContain('LawyerRegisterCompleteStep');
        expect(wizard).toContain('registerLawyer');
        expect(wizard).not.toContain('registerLawyerAccount');
        expect(wizard).toContain('finalizeLawyerOnboarding');
        expect(wizard).toContain('retryHqSubmit');
        expect(wizard).toContain('hqReceived');
        expect(wizard).toContain('SmartToast.error');
        expect(wizard).not.toContain('awaitingEmailConfirm');
        expect(wizard).not.toContain('IdentityImageField');
        expect(wizard).not.toContain('data-testid="lawyer-register-email"');
        const identity = readFileSync(resolve(dir, 'LawyerRegisterIdentityStep.tsx'), 'utf8');
        expect(identity).toContain('IdentityImageField');
        expect(identity).toContain('lawyer-register-id-front');
        expect(identity).toContain('هوية النقابة');
        const field = readFileSync(resolve(dir, 'registerWizardIdentityField.tsx'), 'utf8');
        expect(field).toContain('fileToDataUrl');
        expect(field).toContain('captureMode');
        expect(field).toContain('hami-auth-gate-file-hit');
        expect(field).not.toContain('required={Boolean(required)');
        const complete = readFileSync(resolve(dir, 'LawyerRegisterCompleteStep.tsx'), 'utf8');
        expect(complete).toContain('طلبك وصل إلى الإدارة');
        expect(complete).toContain('الطلب لم يصل للإدارة');
        expect(complete).toContain('إعادة إرسال الطلب للإدارة');
        expect(complete).toContain('lawyer-register-retry-hq');
        expect(complete).toContain('hqReceived');
        expect(complete).toContain('lawyer-register-enter-pending');
        expect(complete).toContain('lawyer-register-resend-confirm');
        expect(identity).toContain('lawyer-register-id-back');
        expect(identity).toContain('أرفق وجه وظهر');
    });
});
