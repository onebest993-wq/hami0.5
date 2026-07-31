import { describe, expect, it, beforeEach } from 'vitest';
import {
    resolveSettingsEscapeAction,
    resetSettingsEscapeGuardsForTests,
} from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';

describe('resolveSettingsEscapeAction', () => {
    beforeEach(() => {
        resetSettingsEscapeGuardsForTests();
    });

    it('يغلق الحوار الذكي قبل الإعدادات', () => {
        expect(resolveSettingsEscapeAction({ smartDialogOpen: true })).toBe('dismiss-dialog');
    });

    it('يلغي عدّاد المسح قبل إغلاق الإعدادات', () => {
        expect(
            resolveSettingsEscapeAction({
                smartDialogOpen: false,
                wipeCountdownActive: true,
            }),
        ).toBe('cancel-wipe-countdown');
    });

    it('يغلق واجهة النسخ قبل الإعدادات', () => {
        expect(
            resolveSettingsEscapeAction({
                smartDialogOpen: false,
                backupUiOpen: true,
            }),
        ).toBe('dismiss-backup-ui');
    });

    it('يغلق الإعدادات عند عدم وجود حوار أو حارس', () => {
        expect(resolveSettingsEscapeAction({ smartDialogOpen: false })).toBe('close-settings');
    });
});
