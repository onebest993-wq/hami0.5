import { useCallback, useRef, useState } from 'react';
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
        setBackupPanelOpen((prev) => {
            const next = !prev;
            if (next) void refreshBackupPreview();
            return next;
        });
    }, [refreshBackupPreview]);

    const exportBusinessBackup = useCallback(async () => {
        await refreshBackupPreview();
        try {
            const built = await buildBusinessBackupPayload(buildSelection());
            const plainText = JSON.stringify(built.payload, null, 2);
            const password = await SmartDialog.prompt(
                'كلمة مرور لحماية النسخة (اتركها فارغة للتصدير بدون حماية):',
                '',
            );
            const p = password?.trim() ?? '';
            if (p && p.length < 6) {
                SmartToast.warning('كلمة المرور قصيرة جداً');
                return;
            }
            const payload = p ? await encryptBusinessBackupText(plainText, p) : built.payload;
            const outText = JSON.stringify(payload, null, 2);
            const blob = new Blob([outText], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const date = new Date().toISOString().slice(0, 10);
            a.download = p ? `hami-business-backup-${date}.protected.json` : `hami-business-backup-${date}.json`;
            a.click();
            URL.revokeObjectURL(url);
            SmartToast.success('تم تصدير نسخة البيانات');
        } catch {
            SmartToast.warning('تعذر تصدير نسخة البيانات على هذا الجهاز');
        }
    }, [buildSelection, refreshBackupPreview]);

    const importBusinessBackup = useCallback(async (entries: Array<[string, string]>) => {
        try {
            await importBusinessBackupEntries(entries);
            SmartToast.success('تم استيراد البيانات');
        } catch {
            SmartToast.warning('تعذر استيراد البيانات');
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
