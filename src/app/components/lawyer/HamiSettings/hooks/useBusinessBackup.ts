import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    buildBusinessBackupPayload,
    decryptBusinessBackupText,
    encryptBusinessBackupText,
    importBusinessBackupEntries,
    parseBusinessBackupFile,
    EMPTY_BACKUP_PREVIEW,
    type BusinessBackupPreview,
    type PendingBusinessImport,
} from '@/app/services/settings/businessBackup';
import {
    validateBusinessBackupImport,
    validateBackupPassword,
    BACKUP_PASSWORD_MIN_LENGTH,
} from '@/app/services/settings/businessBackupSecurity';
import {
    mintSensitiveConfirmChallenge,
    verifySensitiveSettingsAction,
} from '@/app/services/settings/verifySensitiveSettingsAction';
import { registerSettingsBackupUiGuard } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';
import { exportTextFile } from '@/app/services/platform/exportTextFile';

export function useBusinessBackup() {
    const importBusinessInputRef = useRef<HTMLInputElement>(null);
    const [backupPanelOpen, setBackupPanelOpen] = useState(false);
    const [backupIncludeLawsuits, setBackupIncludeLawsuits] = useState(true);
    const [backupIncludeExecution, setBackupIncludeExecution] = useState(true);
    const [backupIncludeNotes, setBackupIncludeNotes] = useState(true);
    const [backupIncludeVault, setBackupIncludeVault] = useState(false);
    const [backupIncludeUrgent, setBackupIncludeUrgent] = useState(true);
    const [backupIncludeUndated, setBackupIncludeUndated] = useState(true);
    const [backupFrom, setBackupFrom] = useState('');
    const [backupTo, setBackupTo] = useState('');
    const [backupPreview, setBackupPreview] = useState<BusinessBackupPreview>(EMPTY_BACKUP_PREVIEW);
    const [pendingBusinessImport, setPendingBusinessImport] = useState<PendingBusinessImport | null>(null);

    const buildSelection = useCallback(
        () => ({
            includeLawsuits: backupIncludeLawsuits,
            includeExecution: backupIncludeExecution,
            includeNotes: backupIncludeNotes,
            includeVault: backupIncludeVault,
            includeUrgent: backupIncludeUrgent,
            includeUndated: backupIncludeUndated,
            from: backupFrom,
            to: backupTo,
        }),
        [
            backupFrom,
            backupIncludeExecution,
            backupIncludeLawsuits,
            backupIncludeNotes,
            backupIncludeUndated,
            backupIncludeUrgent,
            backupIncludeVault,
            backupTo,
        ],
    );

    const refreshBackupPreview = useCallback(async () => {
        setBackupPreview((p) => ({ ...p, isLoading: true }));
        try {
            const built = await buildBusinessBackupPayload(buildSelection());
            setBackupPreview({
                isLoading: false,
                keys: built.keys,
                bytes: built.bytes,
                counts: built.counts,
            });
            if (built.bytes > 30_000_000) {
                SmartToast.warning('حجم النسخة كبير جداً وقد يفشل التصدير على بعض الأجهزة');
            }
        } catch {
            setBackupPreview((p) => ({ ...p, isLoading: false }));
            SmartToast.warning('تعذر تجهيز معاينة النسخة');
        }
    }, [buildSelection]);

    const toggleBackupPanel = useCallback(() => {
        setBackupPanelOpen((prev) => !prev);
    }, []);

    const previewDebounceRef = useRef<number | null>(null);
    useEffect(() => {
        if (!backupPanelOpen) return;
        if (previewDebounceRef.current !== null) window.clearTimeout(previewDebounceRef.current);
        previewDebounceRef.current = window.setTimeout(() => {
            previewDebounceRef.current = null;
            void refreshBackupPreview();
        }, 360);
        return () => {
            if (previewDebounceRef.current !== null) window.clearTimeout(previewDebounceRef.current);
        };
    }, [
        backupPanelOpen,
        backupFrom,
        backupTo,
        backupIncludeExecution,
        backupIncludeLawsuits,
        backupIncludeNotes,
        backupIncludeUndated,
        backupIncludeUrgent,
        backupIncludeVault,
        refreshBackupPreview,
    ]);

    const exportBusinessBackup = useCallback(async () => {
        try {
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

            const password = await SmartDialog.prompt(
                `أدخل كلمة مرور لحماية النسخة (${BACKUP_PASSWORD_MIN_LENGTH} أحرف على الأقل):`,
                '',
            );
            const p = password?.trim() ?? '';
            const passwordCheck = validateBackupPassword(p);
            if (passwordCheck.ok === false) {
                if (passwordCheck.reason === 'empty') {
                    SmartToast.warning('كلمة المرور مطلوبة لحماية النسخة');
                } else {
                    SmartToast.warning(
                        `كلمة المرور قصيرة جداً — الحد الأدنى ${BACKUP_PASSWORD_MIN_LENGTH} حرفاً`,
                    );
                }
                return;
            }

            const built = await buildBusinessBackupPayload(buildSelection());
            setBackupPreview({
                isLoading: false,
                keys: built.keys,
                bytes: built.bytes,
                counts: built.counts,
            });
            const plainText = JSON.stringify(built.payload, null, 2);
            const payload = await encryptBusinessBackupText(plainText, p);
            const outText = JSON.stringify(payload, null, 2);
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
        }
    }, [buildSelection]);

    const importBusinessBackup = useCallback(async (entries: Array<[string, string]>): Promise<boolean> => {
        try {
            await importBusinessBackupEntries(entries);
            SmartToast.success('تم استيراد البيانات');
            return true;
        } catch {
            SmartToast.warning('تعذر استيراد البيانات');
            return false;
        }
    }, []);

    const prepareBusinessImport = useCallback(async (file: File | null | undefined) => {
        if (!file) return;
        if (file.size > 25_000_000) {
            SmartToast.warning('ملف النسخة كبير جداً');
            return;
        }
        try {
            const text = await file.text();
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
                const password = await SmartDialog.prompt('أدخل كلمة المرور لفك حماية النسخة:', '');
                if (!password?.trim()) return;
                try {
                    parsedText = await decryptBusinessBackupText(obj, password.trim());
                    obj = JSON.parse(parsedText) as typeof obj;
                } catch {
                    SmartToast.warning('كلمة المرور غير صحيحة أو الملف تالف');
                    return;
                }
            }
            const parsed = parseBusinessBackupFile(parsedText);
            const validation = validateBusinessBackupImport(parsed.entries);
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
            });
        } catch {
            SmartToast.warning('ملف النسخة غير صالح');
        } finally {
            if (importBusinessInputRef.current) importBusinessInputRef.current.value = '';
        }
    }, []);

    const dismissBackupUi = useCallback(() => {
        setBackupPanelOpen(false);
        setPendingBusinessImport(null);
    }, []);

    useEffect(() => {
        const open = backupPanelOpen || pendingBusinessImport != null;
        registerSettingsBackupUiGuard(open, open ? dismissBackupUi : null);
        return () => registerSettingsBackupUiGuard(false);
    }, [backupPanelOpen, pendingBusinessImport, dismissBackupUi]);

    return {
        importBusinessInputRef,
        backupPanelOpen,
        toggleBackupPanel,
        backupIncludeLawsuits,
        setBackupIncludeLawsuits,
        backupIncludeExecution,
        setBackupIncludeExecution,
        backupIncludeNotes,
        setBackupIncludeNotes,
        backupIncludeVault,
        setBackupIncludeVault,
        backupIncludeUrgent,
        setBackupIncludeUrgent,
        backupIncludeUndated,
        setBackupIncludeUndated,
        backupFrom,
        setBackupFrom,
        backupTo,
        setBackupTo,
        backupPreview,
        refreshBackupPreview,
        exportBusinessBackup,
        pendingBusinessImport,
        setPendingBusinessImport,
        importBusinessBackup,
        prepareBusinessImport,
    };
}
