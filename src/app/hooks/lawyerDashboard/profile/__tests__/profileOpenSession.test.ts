import { afterEach, describe, expect, it } from 'vitest';
import {
    isProfileStudioChromeVisible,
    isProfileStudioSheetVisible,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

describe('profileOpenSession studio chrome', () => {
    afterEach(() => {
        resetProfileOpenedThisPageForTests();
        document.body.innerHTML = '';
    });

    it('ورقة مخفية ليست استوديو ظاهراً', () => {
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'profile-settings-sheet');
        sheet.setAttribute('aria-hidden', 'true');
        sheet.style.display = 'none';
        document.body.appendChild(sheet);

        expect(isProfileStudioSheetVisible()).toBe(false);
        expect(isProfileStudioChromeVisible()).toBe(false);
    });

    it('ورقة ظاهرة تُعدّ استوديو', () => {
        const sheet = document.createElement('div');
        sheet.setAttribute('data-testid', 'profile-settings-sheet');
        document.body.appendChild(sheet);

        expect(isProfileStudioSheetVisible()).toBe(true);
        expect(isProfileStudioChromeVisible()).toBe(true);
    });
});
