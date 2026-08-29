import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { BusinessBackupPreview, BusinessBackupSelection } from '@/app/services/settings/businessBackupTypes';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { exportTextFile } from '@/app/services/platform/exportTextFile';
import { loadBusinessBackupEngine } from './businessBackupEngine';

export async function runBusinessBackupExport(args: {
    buildSelection: () => BusinessBackupSelection;
    setBackupPreview: Dispatch<SetStateAction<BusinessBackupPreview>>;
    exportInFlightRef: MutableRefObject<boolean>;
}): Promise<void> {
    const { buildSelection, setBackupPreview, exportInFlightRef } = args;
    if (exportInFlightRef.current) return;
    exportInFlightRef.current = true;
    try {
        const engineReady = loadBusinessBackupEngine();
        const proceed = await SmartDialog.confirm(
            'النسخة تحتوي بيانات قضايا وملاحظات حساسة. يجب حمايتها بكلمة مرور قبل التصدير.',
            { title: 'تصدير نسخة البيانات؟', confirmText: 'متابعة', cancelText: 'إلغاء' },
        );
        if (!proceed) return;

        const challenge = mintSensitiveConfirmChallenge('تصدير نسخة');
        const verified = await verifySensitiveSettingsAction({
            confirmPhrase: challenge.confirmPhrase,
            title: 'تحقق قبل التصدير',
            promptMessage: challenge.promptMessage,
        });
        if (!verified) return;

        const { backup, security } = await engineReady;
        const password = await SmartDialog.prompt(
            `أدخل كلمة مرور لحماية النسخة (${security.BACKUP_PASSWORD_MIN_LENGTH} أحرف على الأقل):`,
            '',
            {
                title: 'كلمة مرور النسخة',
                confirmText: 'متابعة',
                inputType: 'password',
                autoComplete: 'new-password',
                ariaLabel: 'كلمة مرور النسخة الاحتياطية',
                maxLength: security.BACKUP_PASSWORD_MAX_LENGTH,
            },
        );
        if (password === null) return;
        const p = password;
        const passwordCheck = security.validateBackupPassword(p);
        if (passwordCheck.ok === false) {
            if (passwordCheck.reason === 'empty') {
                SmartToast.warning('كلمة المرور مطلوبة لحماية النسخة');
            } else if (passwordCheck.reason === 'too_long') {
                SmartToast.warning('كلمة المرور أطول من الحد المدعوم');
            } else {
                SmartToast.warning(
                    `كلمة المرور قصيرة جداً — الحد الأدنى ${security.BACKUP_PASSWORD_MIN_LENGTH} حرفاً`,
                );
            }
            return;
        }
        const confirmation = await SmartDialog.prompt(
            'أعد إدخال كلمة المرور للتأكد — لا يمكن استرجاع النسخة دونها:',
            '',
            {
                title: 'تأكيد كلمة المرور',
                confirmText: 'تأكيد',
                inputType: 'password',
                autoComplete: 'new-password',
                ariaLabel: 'تأكيد كلمة مرور النسخة الاحتياطية',
                maxLength: security.BACKUP_PASSWORD_MAX_LENGTH,
            },
        );
        if (confirmation === null) return;
        if (confirmation !== p) {
            SmartToast.warning('كلمتا المرور غير متطابقتين');
            return;
        }

        const built = await backup.buildBusinessBackupPayload(buildSelection());
        setBackupPreview({
            isLoading: false,
            keys: built.keys,
            bytes: built.bytes,
            counts: built.counts,
        });
        if (built.keys === 0) {
            SmartToast.warning('لا توجد بيانات مطابقة لخيارات النسخة');
            return;
        }
        const payload = await backup.encryptBusinessBackupText(built.text, p);
        const outText = JSON.stringify(payload);
        if (new TextEncoder().encode(outText).byteLength > security.MAX_BACKUP_FILE_BYTES) {
            SmartToast.warning('حجم النسخة يتجاوز الحد الآمن للتصدير على الهاتف');
            return;
        }
        const date = new Date().toISOString().slice(0, 10);
        const filename = `hami-business-backup-${date}.protected.json`;
        const result = await exportTextFile({
            filename,
            content: outText,
            mimeType: 'application/json',
            dialogTitle: 'حفظ نسخة احتياطية',
        });
        if (result === 'cancelled') return;
        if (result === 'failed') {
            SmartToast.warning('تعذر تصدير نسخة البيانات على هذا الجهاز');
            return;
        }
        SmartToast.success(result === 'shared' ? 'اختر تطبيقاً لحفظ النسخة' : 'تم تصدير نسخة البيانات');
    } catch {
        SmartToast.warning('تعذر تصدير نسخة البيانات على هذا الجهاز');
    } finally {
        exportInFlightRef.current = false;
    }
}
