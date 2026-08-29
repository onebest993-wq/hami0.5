import { afterEach, describe, expect, it } from 'vitest';
import {
    hasProfileLiveTree,
    isProfileRoyalLivePaintReady,
} from '@/app/components/lawyer/dashboard/profile/profilePageLivePaint';

describe('profilePageLivePaint', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('لا يعتمد قبل وجود الشجرة الحية', () => {
        expect(hasProfileLiveTree()).toBe(false);
        expect(isProfileRoyalLivePaintReady()).toBe(false);
    });

    it('يعتمد عند وجود الجسم حتى لو الكتل معلّقة', () => {
        const live = document.createElement('div');
        live.setAttribute('data-profile-live-tree', '');
        const body = document.createElement('div');
        body.setAttribute('data-profile-page-body', '');
        live.appendChild(body);
        const pending = document.createElement('div');
        pending.setAttribute('data-profile-blocks-pending', '');
        live.appendChild(pending);
        document.body.appendChild(live);

        expect(hasProfileLiveTree()).toBe(true);
        expect(isProfileRoyalLivePaintReady()).toBe(true);
    });
});
