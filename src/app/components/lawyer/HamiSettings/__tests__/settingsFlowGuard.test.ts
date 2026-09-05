import { describe, expect, it } from 'vitest';
import { settingsFlowAbandoned } from '@/app/components/lawyer/HamiSettings/settingsFlowGuard';
import { wallpaperCommitAfterLiveApply } from '@/app/components/lawyer/HamiSettings/appearance/useAppearanceWallpaperControls';

describe('settingsFlowGuard', () => {
    it('settingsFlowAbandoned يعكس نشاط القسم', () => {
        expect(settingsFlowAbandoned({ current: true })).toBe(false);
        expect(settingsFlowAbandoned({ current: false })).toBe(true);
    });

    it('wallpaperCommitAfterLiveApply يثبت إن لم يُلغَ الجيل ويعيد السطح إن أُلغي', () => {
        expect(wallpaperCommitAfterLiveApply(3, 3)).toBe('persist');
        expect(wallpaperCommitAfterLiveApply(3, 4)).toBe('revert');
    });
});
