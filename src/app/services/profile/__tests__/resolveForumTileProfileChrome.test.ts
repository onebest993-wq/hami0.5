import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveForumTileProfileChrome } from '@/app/services/profile/resolveForumTileProfileChrome';
import { resolveProfileHeaderInitial } from '@/app/services/profile/profileHeaderLogic';
import { invalidateProfileWarmCache } from '@/app/services/profile/profileWarmCache';
import {
    resetLawyerProfileBootWarmPendingForTests,
    setLawyerProfileBootWarmPending,
} from '@/app/services/profile/profileBootWarmPending';
import { resetUserIdentityUiStateForTests } from '@/app/services/profile/userIdentityUiState';

vi.mock('@/app/services/profile/lawyerProfileLocalRead', () => ({
    readLocalProfileSync: vi.fn(() => null),
    isLawyerProfileLocalUnread: vi.fn(() => false),
    lawyerProfileLocalRecordExists: vi.fn(() => false),
}));

describe('resolveForumTileProfileChrome', () => {
    beforeEach(() => {
        invalidateProfileWarmCache('lawyer-forum-chrome');
        resetLawyerProfileBootWarmPendingForTests();
        resetUserIdentityUiStateForTests();
    });

    it('يُظهر اسم الجلسة فوراً بلا انتظار مقطع الصورة', () => {
        const chrome = resolveForumTileProfileChrome('lawyer-forum-chrome', {
            full_name: 'احمد مهدي الحسناوي',
        });
        expect(chrome.displayName).toBe('احمد مهدي الحسناوي');
        expect(chrome.profileInitial).toBe('ا');
        expect(chrome.avatarUrl).toBe('');
        expect(chrome.showInitial).toBe(false);
        expect(chrome.isLoaded).toBe(true);
    });

    it('يستخدم بيانات الجلسة حتى بلا معرف عند توفر الاسم', () => {
        const chrome = resolveForumTileProfileChrome(undefined, { full_name: 'اسم الجلسة' });
        expect(chrome.displayName).toBe('اسم الجلسة');
        expect(chrome.profileInitial).toBe('ا');
        expect(chrome.avatarUrl).toBe('');
        expect(chrome.showInitial).toBe(true);
        expect(chrome.isLoaded).toBe(true);
    });

    it('يعود لعنوان افتراضي عند غياب الاسم والمعرف', () => {
        const chrome = resolveForumTileProfileChrome(undefined, {});
        expect(chrome.displayName).toBe('المحامي');
        expect(chrome.profileInitial).toBe(resolveProfileHeaderInitial('المحامي'));
        expect(chrome.avatarUrl).toBe('');
        expect(chrome.showInitial).toBe(true);
        expect(chrome.isLoaded).toBe(true);
    });

    it('يحسب الحساب الجديد بلا اسم جاهزاً بعد التسخين', () => {
        const chrome = resolveForumTileProfileChrome('lawyer-new-nameless', {
            accountType: 'lawyer',
            verificationStatus: 'pending',
        });
        expect(chrome.displayName).toBe('');
        expect(chrome.profileInitial).toBe('م');
        expect(chrome.isLoaded).toBe(true);
        expect(chrome.showInitial).toBe(false);
    });

    it('يرسم صورة الجلسة من metadata فوراً بعد التنقية', () => {
        const chrome = resolveForumTileProfileChrome('lawyer-forum-chrome', {
            full_name: 'احمد مهدي الحسناوي',
            avatar_url: 'https://cdn.example/a.jpg',
        });
        expect(chrome.avatarUrl).toBe('https://cdn.example/a.jpg');
        expect(chrome.showInitial).toBe(false);

        const rejected = resolveForumTileProfileChrome('lawyer-forum-chrome-js', {
            full_name: 'احمد مهدي الحسناوي',
            avatar_url: 'javascript:alert(1)',
        });
        expect(rejected.avatarUrl).toBe('');
    });

    it('يحتفظ بالاسم أثناء التسخين دون حرف ذهبي مبكر', () => {
        setLawyerProfileBootWarmPending(true);
        const chrome = resolveForumTileProfileChrome('lawyer-forum-chrome', {
            full_name: 'احمد مهدي الحسناوي',
        });
        expect(chrome.displayName).toBe('احمد مهدي الحسناوي');
        expect(chrome.showInitial).toBe(false);
        expect(chrome.isLoaded).toBe(false);
    });
});
