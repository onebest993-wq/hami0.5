import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('علل الإعدادات الخفية — لا تعود بعد الإصلاح', () => {
    it('فخ التركيز لا يسرق الورقة المتداخلة ويحصر Tab داخلها', () => {
        const trap = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap.ts',
        );
        expect(trap).toContain('hami-settings-sheet-panel');
        expect(trap).toContain('isSettingsNestedSheetTarget');
        expect(trap).toContain('cycleTabWithin');
        expect(trap).toContain("document.addEventListener('keydown', onDocTab, true)");
    });

    it('تصدير واستيراد النسخة يتوقفان بعد كل انتظار عبر حارسة موحّدة', () => {
        const guard = read('src/app/components/lawyer/HamiSettings/settingsFlowGuard.ts');
        expect(guard).toContain('export function settingsFlowAbandoned');
        expect(guard).toContain('export function useSettingsSectionActiveRef');
        const exportFlow = read(
            'src/app/components/lawyer/HamiSettings/hooks/businessBackupExportFlow.ts',
        );
        expect(exportFlow).toContain('settingsFlowAbandoned');
        expect(exportFlow).not.toContain('function exportAbandoned');
        expect(exportFlow).toContain('if (!proceed || settingsFlowAbandoned(sectionActiveRef)) return');
        expect(exportFlow).toContain('if (settingsFlowAbandoned(sectionActiveRef)) return');
        const hook = read('src/app/components/lawyer/HamiSettings/hooks/useBusinessBackup.ts');
        expect(hook).toContain('sectionActiveRef');
        expect(hook).toContain('importBusinessBackupEntries(entries, vaultBlobs, sectionActiveRef)');
        const importSection = read(
            'src/app/components/lawyer/HamiSettings/data/BusinessBackupSection.tsx',
        );
        expect(importSection).toContain('if (!ok || settingsFlowAbandoned(sectionActiveRef)) return');
        expect(importSection).toContain(
            'if (!verified || settingsFlowAbandoned(sectionActiveRef)) return',
        );
        const importFlow = read(
            'src/app/components/lawyer/HamiSettings/hooks/businessBackupImportFlow.ts',
        );
        expect(importFlow).toContain(
            'if (password === null || !password.trim() || settingsFlowAbandoned(sectionActiveRef))',
        );
        expect(importFlow).toContain('if (!settingsFlowAbandoned(sectionActiveRef))');
    });

    it('تطبيق الخلفية يُلغى عند مغادرة المنظر ولا يُضاعَف', () => {
        const wallpaper = read(
            'src/app/components/lawyer/HamiSettings/appearance/useAppearanceWallpaperControls.ts',
        );
        expect(wallpaper).toContain('applyGenerationRef');
        expect(wallpaper).toContain('applyInFlightRef');
        expect(wallpaper).toContain('sectionActiveRef');
        expect(wallpaper).toContain('wallpaperCommitAfterLiveApply');
        expect(wallpaper).toContain('settingsFlowAbandoned(sectionActiveRef)');
        expect(wallpaper).toContain('resolveWallpaperSrc(appearance)');
        expect(wallpaper).toContain('if (sectionActive) return');
        const card = read(
            'src/app/components/lawyer/HamiSettings/appearance/useAppearanceWallpaperCard.ts',
        );
        expect(card).toContain('if (settingsFlowAbandoned(sectionActiveRef)) return');
    });

    it('المسح ومسح الحساب يُقفلان عند أول نقر قبل الحوار', () => {
        const countdown = read(
            'src/app/components/lawyer/HamiSettings/hooks/useWipeCountdown.ts',
        );
        expect(countdown).toContain("export type WipePhase = 'idle' | 'confirming' | 'countdown' | 'wiping'");
        expect(countdown).toContain('beginDangerRequest');
        expect(countdown).toContain('requestInFlightRef');
        expect(countdown).toContain("setWipePhase('confirming')");
        expect(countdown).toContain('settingsFlowAbandoned(sectionActiveRef)');
        expect(countdown).toContain('subscribeAppForeground');
        expect(countdown).toContain('onSuspend: cancelCountdown');
        const wipe = read('src/app/components/lawyer/HamiSettings/hooks/useLocalDataClear.ts');
        expect(wipe).toContain('beginDangerRequest');
        expect(wipe).toContain('endDangerRequest');
        expect(wipe).toContain('settingsFlowAbandoned(sectionActiveRef)');
        expect(wipe).not.toContain("if (wipePhase !== 'idle' || !sectionActiveRef.current) return");
        const account = read(
            'src/app/components/lawyer/HamiSettings/account/useAccountSectionActions.ts',
        );
        expect(account).toContain('beginDangerRequest');
        expect(account).toContain('logoutInFlightRef');
        expect(account).toContain('settingsFlowAbandoned(sectionActiveRef)');
        const danger = read('src/app/components/lawyer/HamiSettings/data/DataDangerZone.tsx');
        expect(danger).toContain("wipe.wipePhase !== 'idle'");
        expect(danger).toContain('resetInFlightRef');
        const rows = read(
            'src/app/components/lawyer/HamiSettings/account/AccountSessionRows.tsx',
        );
        expect(rows).toContain('deletePhase !== \'idle\' || logoutPending');
    });

    it('مزامنة الآن ولقطة التفعيل لا تستخدمان حالة قديمة أو نقراً مزدوجاً', () => {
        const sync = read('src/app/components/lawyer/HamiSettings/data/useDataSyncCard.ts');
        expect(sync).toContain('syncInFlightRef');
        expect(sync).toContain('cloudSyncInFlightRef');
        expect(sync).toContain('if (syncMountedRef.current) setSyncNowPending(false)');
        const toggle = read('src/app/components/lawyer/HamiSettings/data/dataCloudSyncToggle.ts');
        expect(toggle).toContain('inFlightRef');
        expect(toggle).toContain('cloudSyncBlockedByLocalOnly');
        expect(toggle).toContain('const live = getLawyerSettingsSnapshot()');
        expect(toggle).toContain('...live');
        expect(toggle).not.toContain('const snap = getLawyerSettingsSnapshot()');
        expect(toggle).not.toContain('saveToCloud');
        expect(toggle).not.toContain('loadFromCloud');
        expect(existsSync(join(root, 'src/app/context/lawyerSettings/useLawyerSettingsCloudSync.ts'))).toBe(
            false,
        );
    });

    it('إغلاق الطبقة وتبديل التبويب يلغيان الحوارات، والفهرس المحجور والورقة يُحرسان', () => {
        const close = read('src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts');
        expect(close).toContain('dismissSettingsSmartDialogs');
        expect(close).toContain('enterSmartDialogScope');
        expect(close).not.toContain('dismissAllSmartDialogs');
        const tabs = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsActiveSection.ts',
        );
        expect(tabs).toContain('dismissSettingsSmartDialogs');
        expect(tabs).not.toContain('dismissAllSmartDialogs');
        const bus = read('src/app/components/ui/smartDialogBus.ts');
        expect(bus).toContain('export function dismissSettingsSmartDialogs');
        expect(bus).toContain('export function dismissSmartDialogsInScope');
        expect(bus).toContain('SMART_DIALOG_SCOPE_SETTINGS');
        const escapeHook = read(
            'src/app/components/lawyer/HamiSettings/hooks/useSettingsShellFocusTrap.ts',
        );
        expect(escapeHook).toContain('resolveSettingsEscapeAction');
        expect(escapeHook).toContain('dismissActiveSmartDialog');
        expect(escapeHook).toContain('registerNativeBackHandler');
        expect(close).not.toContain('resolveSettingsEscapeAction');
        const quarantine = read(
            'src/app/components/lawyer/HamiSettings/data/ExecutionIndexQuarantineRow.tsx',
        );
        expect(quarantine).toContain('inFlightRef');
        expect(quarantine).toContain('sectionActiveRef');
        expect(quarantine).toContain('if (!ok || settingsFlowAbandoned(sectionActiveRef)) return');
        const danger = read('src/app/components/lawyer/HamiSettings/data/DataDangerZone.tsx');
        expect(danger).toContain('if (!ok || settingsFlowAbandoned(sectionActiveRef)) return');
        expect(danger).toContain('if (!verified || settingsFlowAbandoned(sectionActiveRef)) return');
        const account = read(
            'src/app/components/lawyer/HamiSettings/account/AccountSection.tsx',
        );
        expect(account).toContain('if (!sectionActive) setOpenLegalDocument(null)');
        const sheet = read(
            'src/app/components/lawyer/HamiSettings/SettingsNestedSheetFrame.tsx',
        );
        expect(sheet).toContain('SHEET_FOCUSABLE_SELECTOR');
        expect(sheet).toContain('first?.focus({ preventScroll: true })');
    });
});
