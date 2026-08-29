import { describe, expect, it, beforeEach } from 'vitest';
import {
    peekProfileWarmCache,
    setProfileWarmCache,
    invalidateProfileWarmCache,
    hydrateProfileWarmCachePeekSync,
    subscribeProfileWarmCache,
} from '@/app/services/profile/profileWarmCache';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';
import SecureStoreService from '@/app/services/SecureStoreService';
import { getLawyerProfileLocalKey } from '@/app/services/profile/profileLocalKey';
import { DEFAULT_LAWYER_PROFILE } from '@/app/services/cloud/lawyerProfileTypes';
import {
    setLawyerProfileBootWarmPending,
    resetLawyerProfileBootWarmPendingForTests,
} from '@/app/services/profile/profileBootWarmPending';

const sampleProfile = (): LawyerProfileData => ({
    header: {
        name: 'A'.repeat(120),
        title: 'محامٍ',
        profileImage: '',
    },
    sections: [
        {
            type: 'actions',
            data: [
                {
                    id: 'a1',
                    type: 'call',
                    label: 'L'.repeat(80),
                    value: '07501234567',
                },
            ],
        },
    ],
    customization: {},
});

describe('profileWarmCache', () => {
    beforeEach(() => {
        invalidateProfileWarmCache();
        resetLawyerProfileBootWarmPendingForTests();
    });

    it('يخزّن نسخة مُنقّاة من الملف', () => {
        setProfileWarmCache('lawyer-1', sampleProfile());
        const cached = peekProfileWarmCache('lawyer-1');
        expect(cached?.header.name.length).toBeLessThanOrEqual(80);
        const actions = cached?.sections.find((s) => s.type === 'actions')?.data as { label: string; value: string }[];
        expect(actions?.[0]?.label.length).toBeLessThanOrEqual(48);
        expect(actions?.[0]?.value.length).toBeLessThanOrEqual(240);
    });

    it('يبطّل ذاكرة مستخدم محدّد', () => {
        setProfileWarmCache('lawyer-1', sampleProfile());
        invalidateProfileWarmCache('lawyer-1');
        expect(peekProfileWarmCache('lawyer-1')).toBeUndefined();
    });

    it('hydrateProfileWarmCachePeekSync يبني بذرة من userMeta عند غياب المحلي', () => {
        const peeked = hydrateProfileWarmCachePeekSync(
            'lawyer-peek',
            { full_name: 'أحمدع', avatar_url: 'https://cdn.example/a.jpg' },
            'lawyer-peek',
        );
        expect(peeked?.header.name).toBeTruthy();
        expect(peeked?.header.profileImage).toBe('https://cdn.example/a.jpg');
        expect(peekProfileWarmCache('lawyer-peek')?.header.name).toBe(peeked?.header.name);
    });

    it('يرقّي الملف المحلي الأغنى ولا يزرع بذرة JWT القصيرة', () => {
        const uid = 'lawyer-upgrade';
        hydrateProfileWarmCachePeekSync(uid, { name: 'أحمد' }, uid);
        expect(peekProfileWarmCache(uid)).toBeUndefined();
        SecureStoreService.setItemSync(
            getLawyerProfileLocalKey(uid),
            JSON.stringify({
                ...DEFAULT_LAWYER_PROFILE,
                header: { ...DEFAULT_LAWYER_PROFILE.header, name: 'أحمد مهدي' },
            }),
        );
        hydrateProfileWarmCachePeekSync(uid, { name: 'أحمد' }, uid);
        expect(peekProfileWarmCache(uid)?.header.name).toBe('أحمد مهدي');
    });

    it('لا يستبدل اسم ملف محفوظ باسم جلسة مختلف تماماً', () => {
        const uid = 'lawyer-keep-saved';
        setProfileWarmCache(uid, {
            ...DEFAULT_LAWYER_PROFILE,
            header: { ...DEFAULT_LAWYER_PROFILE.header, name: 'أحمد' },
        });
        hydrateProfileWarmCachePeekSync(uid, { fullName: 'اختبار' }, uid);
        expect(peekProfileWarmCache(uid)?.header.name).toBe('أحمد');
    });

    it('لا يزرع بذرة من حقل JWT القصير name', () => {
        const uid = 'lawyer-jwt-short';
        expect(hydrateProfileWarmCachePeekSync(uid, { name: 'أحمد' }, uid)).toBeNull();
        expect(peekProfileWarmCache(uid)).toBeUndefined();
    });

    it('لا يزرع بذرة جلسة قصيرة أثناء تسخين الملف المحلي', () => {
        const uid = 'lawyer-pending';
        setLawyerProfileBootWarmPending(true);
        expect(hydrateProfileWarmCachePeekSync(uid, { name: 'أحمد' }, uid)).toBeNull();
        expect(peekProfileWarmCache(uid)).toBeUndefined();
    });

    it('يُخفّي الحقول الحساسة للزائر عند peek', () => {
        setProfileWarmCache('lawyer-1', {
            ...sampleProfile(),
            header: {
                ...sampleProfile().header,
                phone: '07501234567',
            },
            customization: {
                privacy: {
                    showPhoneMeta: false,
                    showCityMeta: true,
                    showSyndicate: true,
                    showContactChannels: true,
                    showGallery: true,
                    showCustomBlocks: true,
                    hiddenContactIds: [],
                },
                appearance: { accentColor: 'gold', material: 'glass' },
                customBlocks: [],
            },
        });
        const ownerView = peekProfileWarmCache('lawyer-1', { viewerId: 'lawyer-1' });
        const visitorView = peekProfileWarmCache('lawyer-1', { viewerId: 'viewer-2' });
        expect(ownerView?.header.phone).toBe('07501234567');
        expect(visitorView?.header.phone).toBe('');
    });

    it('يفرض redact عند تمرير options بمشاهد فارغ (fail-closed)', () => {
        setProfileWarmCache('lawyer-1', {
            ...sampleProfile(),
            header: {
                ...sampleProfile().header,
                phone: '07501234567',
            },
            customization: {
                privacy: {
                    showPhoneMeta: false,
                    showCityMeta: true,
                    showSyndicate: true,
                    showContactChannels: true,
                    showGallery: true,
                    showCustomBlocks: true,
                    hiddenContactIds: [],
                },
                appearance: { accentColor: 'gold', material: 'glass' },
                customBlocks: [],
            },
        });
        const emptyViewer = peekProfileWarmCache('lawyer-1', { viewerId: '' });
        expect(emptyViewer?.header.phone).toBe('');
        /* بلا options يبقى مسار المالك الداخلي كاملاً */
        expect(peekProfileWarmCache('lawyer-1')?.header.phone).toBe('07501234567');
    });

    it('يُخطر المشتركين عند الكتابة', () => {
        const seen: string[] = [];
        const unsub = subscribeProfileWarmCache((id) => {
            seen.push(id);
        });
        setProfileWarmCache('lawyer-1', sampleProfile());
        expect(seen).toContain('lawyer-1');
        unsub();
    });
});
