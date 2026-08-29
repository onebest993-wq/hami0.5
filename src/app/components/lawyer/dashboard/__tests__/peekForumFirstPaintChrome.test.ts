import { describe, expect, it, beforeEach } from 'vitest';
import { peekForumFirstPaintChrome } from '@/app/components/lawyer/dashboard/peekForumFirstPaintChrome';
import { setProfileWarmCacheRaw, deleteProfileWarmCacheRaw } from '@/app/services/profile/profileWarmCacheStore';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import {
    setLawyerProfileBootWarmPending,
    resetLawyerProfileBootWarmPendingForTests,
} from '@/app/services/profile/profileBootWarmPending';
import { resetUserIdentityUiStateForTests } from '@/app/services/profile/userIdentityUiState';

describe('peekForumFirstPaintChrome', () => {
    beforeEach(() => {
        localStorage.clear();
        deleteProfileWarmCacheRaw();
        resetLawyerProfileBootWarmPendingForTests();
        resetUserIdentityUiStateForTests();
    });

    it('يقرأ الاسم الأطول من جلسة Supabase المحلية', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({
                user: {
                    id: 'lawyer-1',
                    user_metadata: { name: 'أحمد', full_name: 'أحمد مهدي' },
                },
            }),
        );
        const chrome = peekForumFirstPaintChrome();
        expect(chrome.displayName).toBe('أحمد مهدي');
        expect(chrome.profileInitial).toBe('أ');
        expect(chrome.showInitial).toBe(false);
    });

    it('يعود إلى المحامي عند غياب الجلسة', () => {
        expect(peekForumFirstPaintChrome()).toEqual({
            displayName: 'المحامي',
            profileInitial: 'ا',
            avatarUrl: '',
            showInitial: true,
            isLoaded: true,
        });
    });

    it('يفضّل الاسم الأغنى من الكاش الدافئ على بادئة الجلسة', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({
                user: {
                    id: 'lawyer-1',
                    user_metadata: { name: 'أحمد' },
                },
            }),
        );
        setProfileWarmCacheRaw('lawyer-1', {
            ...DEFAULT_LAWYER_PROFILE,
            header: { ...DEFAULT_LAWYER_PROFILE.header, name: 'أحمد مهدي' },
        });
        expect(peekForumFirstPaintChrome().displayName).toBe('أحمد مهدي');
    });

    it('لا يرسم حقل name القصير من الجلسة حتى يصل الملف المحلي', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({
                user: {
                    id: 'lawyer-1',
                    user_metadata: { name: 'أحمد' },
                },
            }),
        );
        const chrome = peekForumFirstPaintChrome();
        expect(chrome.displayName).toBe('');
        expect(chrome.profileInitial).toBe('م');
        expect(chrome.avatarUrl).toBe('');
        expect(chrome.showInitial).toBe(false);
    });

    it('يخفي الحرف أثناء تسخين الملف حتى لا يومض فوق الشعار', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({
                user: {
                    id: 'lawyer-1',
                    user_metadata: { name: 'أحمد' },
                },
            }),
        );
        setLawyerProfileBootWarmPending(true);
        const chrome = peekForumFirstPaintChrome();
        expect(chrome.displayName).toBe('');
        expect(chrome.showInitial).toBe(false);
    });
});
