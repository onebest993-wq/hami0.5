import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type {
    BusinessBackupVaultBlob,
    PendingBusinessImport,
} from '@/app/services/settings/businessBackupTypes';
import { settingsFlowAbandoned } from '../settingsFlowGuard';
import { loadBusinessBackupEngine } from './businessBackupEngine';

export async function importBusinessBackupEntries(
    entries: Array<[string, string]>,
    vaultBlobs: BusinessBackupVaultBlob[] = [],
    sectionActiveRef?: MutableRefObject<boolean>,
): Promise<boolean> {
    try {
        const { backup } = await loadBusinessBackupEngine();
        await backup.importBusinessBackupEntries(entries, vaultBlobs);
        if (!sectionActiveRef || !settingsFlowAbandoned(sectionActiveRef)) {
            SmartToast.success('تم استيراد البيانات');
        }
        return true;
    } catch {
        if (!sectionActiveRef || !settingsFlowAbandoned(sectionActiveRef)) {
            SmartToast.warning('تعذر استيراد البيانات');
        }
        return false;
    }
}

export async function prepareBusinessImportFile(args: {
    file: File | null | undefined;
    sectionActiveRef: MutableRefObject<boolean>;
    importBusinessInputRef: RefObject<HTMLInputElement | null>;
    setPendingBusinessImport: Dispatch<SetStateAction<PendingBusinessImport | null>>;
}): Promise<void> {
    const { file, sectionActiveRef, importBusinessInputRef, setPendingBusinessImport } = args;
    if (!file || settingsFlowAbandoned(sectionActiveRef)) return;
    try {
        const { backup, security } = await loadBusinessBackupEngine();
        if (settingsFlowAbandoned(sectionActiveRef)) return;
        if (file.size > security.MAX_BACKUP_FILE_BYTES) {
            SmartToast.warning('ملف النسخة كبير جداً');
            return;
        }
        const text = await file.text();
        if (settingsFlowAbandoned(sectionActiveRef)) return;
        let parsedText = text;
        let obj = JSON.parse(text) as {
            kind?: unknown;
            version?: unknown;
            createdAt?: unknown;
            kdf?: unknown;
            salt?: unknown;
            iv?: unknown;
            ciphertext?: unknown;
        };
        if (obj?.kind === 'hami-business-backup-encrypted') {
            const password = await SmartDialog.prompt(
                'أدخل كلمة المرور لفك حماية النسخة:',
                '',
                {
                    title: 'فتح النسخة المحمية',
                    confirmText: 'فتح',
                    inputType: 'password',
                    autoComplete: 'current-password',
                    ariaLabel: 'كلمة مرور النسخة الاحتياطية',
                    maxLength: security.BACKUP_PASSWORD_MAX_LENGTH,
                },
            );
            if (password === null || !password.trim() || settingsFlowAbandoned(sectionActiveRef)) {
                return;
            }
            try {
                parsedText = await backup.decryptBusinessBackupText(obj, password);
                if (settingsFlowAbandoned(sectionActiveRef)) return;
                obj = JSON.parse(parsedText) as typeof obj;
            } catch {
                if (!settingsFlowAbandoned(sectionActiveRef)) {
                    SmartToast.warning('كلمة المرور غير صحيحة أو الملف تالف');
                }
                return;
            }
        }
        const parsed = backup.parseBusinessBackupFile(parsedText);
        if (settingsFlowAbandoned(sectionActiveRef)) return;
        const validation = security.validateBusinessBackupImport(parsed.entries);
        if (validation.ok === false) {
            SmartToast.warning(validation.reason);
            return;
        }
        setPendingBusinessImport({
            fileName: file.name,
            version: parsed.version,
            createdAt: parsed.createdAt,
            selection: parsed.selection,
            range: parsed.range,
            counts: parsed.counts,
            keys: parsed.keys,
            entries: parsed.entries,
            vaultBlobs: parsed.vaultBlobs,
        });
    } catch {
        if (!settingsFlowAbandoned(sectionActiveRef)) {
            SmartToast.warning('ملف النسخة غير صالح');
        }
    } finally {
        if (importBusinessInputRef.current) importBusinessInputRef.current.value = '';
    }
}
