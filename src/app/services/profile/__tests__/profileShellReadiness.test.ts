import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/app/runtime/profileHubLoader', () => ({
    isProfileShellModuleResolved: vi.fn(() => true),
}));

import { isProfileShellModuleResolved } from '@/app/runtime/profileHubLoader';
import {
    hasProfileTreePaintedInDom,
    isProfileShellReadySync,
} from '@/app/services/profile/profileShellReadiness';

describe('profileShellReadiness', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        vi.mocked(isProfileShellModuleResolved).mockReturnValue(true);
    });

    it('isProfileShellReadySync يتطلب hostMounted', () => {
        expect(isProfileShellReadySync('lawyer-1', false)).toBe(false);
    });

    it('isProfileShellReadySync true عند شجرة مرسومة', () => {
        document.body.innerHTML = `
          <div data-testid="lawyer-dashboard-profile-surface">
            <div data-lawyer-profile-root></div>
          </div>
        `;
        expect(isProfileShellReadySync('lawyer-1', true)).toBe(true);
        expect(hasProfileTreePaintedInDom()).toBe(true);
    });
});
