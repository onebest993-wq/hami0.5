import { describe, expect, it, afterEach } from 'vitest';
import { applyProfileRootTheme, clearLiveProfileAppearance } from '@/app/services/profile/profileThemeRuntime';

describe('profileThemeRuntime', () => {
    afterEach(() => {
        document.body.replaceChildren();
        clearLiveProfileAppearance();
    });

    it('يكتب لون التمييز والخامة والإطار على جذر الملف', () => {
        const root = document.createElement('div');
        root.setAttribute('data-lawyer-profile-root', '');
        document.body.appendChild(root);

        applyProfileRootTheme({
            accentColor: 'emerald',
            material: 'metallic',
            portraitFrame: 'arch',
        });

        expect(root.dataset.profileAccent).toBe('emerald');
        expect(root.dataset.profileMaterial).toBe('metallic');
        expect(root.dataset.profilePortraitFrame).toBe('arch');
        expect(root.style.getPropertyValue('--profile-accent').toLowerCase()).toBe('#34d399');
    });
});
