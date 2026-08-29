import { useCallback, useEffect, useRef, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { EMPTY_BACKUP_PREVIEW, type BusinessBackupPreview, type PendingBusinessImport } from '@/app/services/settings/businessBackupTypes';
import { registerSettingsBackupUiGuard } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';
import { useSettingsSectionActive } from '../settingsSectionActiveContext';
import { loadBusinessBackupEngine, prefetchBusinessBackupEngine } from './businessBackupEngine';
import { runBusinessBackupExport } from './businessBackupExportFlow';
import { importBusinessBackupEntries, prepareBusinessImportFile } from './businessBackupImportFlow';
import { useBusinessBackupSelection } from './useBusinessBackupSelection';

export function useBusinessBackup() {
    const sectionActive = useSettingsSectionActive();
    const sectionActiveRef = useRef(sectionActive);
    sectionActiveRef.current = sectionActive;
    const importBusinessInputRef = useRef<HTMLInputElement>(null);
    const [backupPanelOpen, setBackupPanelOpen] = useState(false);
    const selection = useBusinessBackupSelection();
    const { buildSelection } = selection;
    const [backupPreview, setBackupPreview] = useState<BusinessBackupPreview>(EMPTY_BACKUP_PREVIEW);
    const [pendingBusinessImport, setPendingBusinessImport] = useState<PendingBusinessImport | null>(null);
    const previewGenerationRef = useRef(0);
    const exportInFlightRef = useRef(false);

    const refreshBackupPreview = useCallback(async () => {
        const generation = ++previewGenerationRef.current;
        setBackupPreview((p) => ({ ...p, isLoading: true }));
        try {
            const { backup, security } = await loadBusinessBackupEngine();
            if (previewGenerationRef.current !== generation) return;
            const built = await backup.buildBusinessBackupPayload(buildSelection(), {
                materializeVaultBlobs: false,
            });
            if (previewGenerationRef.current !== generation) return;
            setBackupPreview({
                isLoading: false,
                keys: built.keys,
                bytes: built.bytes,
                counts: built.counts,
            });
            if (built.bytes > security.MAX_BACKUP_PLAINTEXT_BYTES * 0.8) {
                SmartToast.warning('حجم النسخة قريب من الحد الآمن للتصدير على الهاتف');
            }
        } catch {
            if (previewGenerationRef.current !== generation) return;
            setBackupPreview((p) => ({ ...p, isLoading: false }));
            SmartToast.warning('تعذر تجهيز معاينة النسخة');
        }
    }, [buildSelection]);

    const toggleBackupPanel = useCallback(() => {
        setBackupPanelOpen((prev) => {
            if (prev) previewGenerationRef.current += 1;
            else prefetchBusinessBackupEngine();
            return !prev;
        });
    }, []);

    const previewDebounceRef = useRef<number | null>(null);
    useEffect(() => {
        if (!sectionActive || !backupPanelOpen) return;
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
        selection.backupFrom,
        selection.backupTo,
        selection.backupIncludeExecution,
        selection.backupIncludeLawsuits,
        selection.backupIncludeNotes,
        selection.backupIncludeUndated,
        selection.backupIncludeUrgent,
        selection.backupIncludeVault,
        refreshBackupPreview,
        sectionActive,
    ]);

    useEffect(() => {
        if (sectionActive) return;
        previewGenerationRef.current += 1;
        setPendingBusinessImport(null);
        setBackupPreview((preview) =>
            preview.isLoading ? { ...preview, isLoading: false } : preview,
        );
    }, [sectionActive]);

    const exportBusinessBackup = useCallback(async () => {
        await runBusinessBackupExport({
            buildSelection,
            setBackupPreview,
            exportInFlightRef,
        });
    }, [buildSelection]);

    const importBusinessBackup = useCallback(importBusinessBackupEntries, []);

    const prepareBusinessImport = useCallback(async (file: File | null | undefined) => {
        await prepareBusinessImportFile({
            file,
            sectionActiveRef,
            importBusinessInputRef,
            setPendingBusinessImport,
        });
    }, []);

    const dismissBackupUi = useCallback(() => {
        previewGenerationRef.current += 1;
        setBackupPanelOpen(false);
        setPendingBusinessImport(null);
    }, []);

    useEffect(() => {
        const open = sectionActive && (backupPanelOpen || pendingBusinessImport != null);
        registerSettingsBackupUiGuard(open, open ? dismissBackupUi : null);
        return () => registerSettingsBackupUiGuard(false);
    }, [backupPanelOpen, pendingBusinessImport, dismissBackupUi, sectionActive]);

    return {
        importBusinessInputRef,
        backupPanelOpen,
        toggleBackupPanel,
        ...selection,
        backupPreview,
        refreshBackupPreview,
        exportBusinessBackup,
        pendingBusinessImport,
        setPendingBusinessImport,
        importBusinessBackup,
        prepareBusinessImport,
    };
}
