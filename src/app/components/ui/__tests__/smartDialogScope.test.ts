import { afterEach, describe, expect, it } from 'vitest';
import {
    SMART_DIALOG_SCOPE_SETTINGS,
    SmartDialog,
    dismissAllSmartDialogs,
    dismissSettingsSmartDialogs,
    enterSmartDialogScope,
    exitSmartDialogScope,
    isSmartDialogOpen,
} from '@/app/components/ui/smartDialogBus';

describe('نطاق SmartDialog للإعدادات', () => {
    afterEach(() => {
        dismissAllSmartDialogs();
        exitSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
    });

    it('يلغي حوارات الإعدادات ويبقي حوار التطبيق', async () => {
        enterSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
        const settingsDialog = SmartDialog.confirm('إعدادات');
        exitSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
        const appDialog = SmartDialog.confirm('تطبيق');

        dismissSettingsSmartDialogs();

        await expect(settingsDialog).resolves.toBe(false);
        expect(isSmartDialogOpen()).toBe(true);

        dismissAllSmartDialogs();
        await expect(appDialog).resolves.toBe(false);
        expect(isSmartDialogOpen()).toBe(false);
    });

    it('يلغي الظاهر والمكدّس داخل النطاق فقط', async () => {
        enterSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
        const first = SmartDialog.confirm('أول إعدادات');
        const second = SmartDialog.confirm('ثانٍ إعدادات');
        exitSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
        const appDialog = SmartDialog.confirm('تطبيق');

        enterSmartDialogScope(SMART_DIALOG_SCOPE_SETTINGS);
        dismissSettingsSmartDialogs();

        await expect(first).resolves.toBe(false);
        await expect(second).resolves.toBe(false);
        expect(isSmartDialogOpen()).toBe(true);

        dismissAllSmartDialogs();
        await expect(appDialog).resolves.toBe(false);
    });
});
