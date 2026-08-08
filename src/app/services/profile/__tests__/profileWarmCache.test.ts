import { describe, expect, it, beforeEach } from 'vitest';
import {
    peekProfileWarmCache,
    setProfileWarmCache,
    invalidateProfileWarmCache,
    hydrateProfileWarmCachePeekSync,
} from '@/app/services/profile/profileWarmCache';
import type { LawyerProfileData } from '@/app/services/lawyer-cloud';

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
        const peeked = hydrateProfileWarmCachePeekSync('lawyer-peek', { full_name: 'أحمدع' }, 'lawyer-peek');
        expect(peeked?.header.name).toBeTruthy();
        expect(peekProfileWarmCache('lawyer-peek')?.header.name).toBe(peeked?.header.name);
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
});
