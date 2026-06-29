import { describe, expect, it } from 'vitest';
import { resolveSettingsEscapeAction } from '@/app/components/lawyer/HamiSettings/settingsEscapeStack';

describe('resolveSettingsEscapeAction', () => {
    it('يغلق الحوار الذكي قبل الإعدادات', () => {
        expect(resolveSettingsEscapeAction({ smartDialogOpen: true })).toBe('dismiss-dialog');
    });

    it('يغلق الإعدادات عند عدم وجود حوار', () => {
        expect(resolveSettingsEscapeAction({ smartDialogOpen: false })).toBe('close-settings');
    });
});
