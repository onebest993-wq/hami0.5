import { describe, expect, it } from 'vitest';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import { deriveProfilePageView } from '../deriveProfilePageView';

describe('deriveProfilePageView', () => {
    it('يخفي أقسام الزائر وفق الخصوصية', () => {
        const privacy = {
            ...defaultProfilePageCustomization().privacy,
            showContactChannels: false,
            showGallery: false,
            showCustomBlocks: false,
            showPhoneMeta: false,
            showCityMeta: false,
            showSyndicate: false,
        };

        const view = deriveProfilePageView({
            privacy,
            actions: [{ id: 'a1', type: 'call', label: 'اتصال', value: '07501234567' }],
            phonePublic: '07501234567',
            cityPublic: 'بغداد',
            syndicateIdPublic: '123',
            isVisitor: true,
            settingsOpen: false,
        });

        expect(view.showContactSection).toBe(false);
        expect(view.showGallerySection).toBe(false);
        expect(view.showCustomBlocks).toBe(false);
        expect(view.metaItems).toHaveLength(0);
        expect(view.showSyndicate).toBe(false);
    });

    it('المالك خارج الاستوديو يرى القنوات حتى لو أعلام الزائر مغلقة', () => {
        const privacy = {
            ...defaultProfilePageCustomization().privacy,
            showContactChannels: false,
            showGallery: false,
        };

        const view = deriveProfilePageView({
            privacy,
            actions: [{ id: 'a1', type: 'call', label: 'اتصال', value: '07501234567' }],
            phonePublic: undefined,
            cityPublic: undefined,
            syndicateIdPublic: undefined,
            isVisitor: false,
            settingsOpen: false,
        });

        expect(view.showContactSection).toBe(true);
        expect(view.visibleActions).toHaveLength(1);
        expect(view.showGallerySection).toBe(true);
    });
});
