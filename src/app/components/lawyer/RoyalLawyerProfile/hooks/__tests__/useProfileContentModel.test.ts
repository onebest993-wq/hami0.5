import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileContentModel } from '../useProfileContentModel';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

describe('useProfileContentModel', () => {
    it('يخفي أقسام الزائر وفق الخصوصية', () => {
        const customization = defaultProfilePageCustomization();
        customization.privacy = {
            ...customization.privacy,
            showContactChannels: false,
            showGallery: false,
            showCustomBlocks: false,
            showPhoneMeta: false,
            showCityMeta: false,
            showSyndicate: false,
        };

        const { result } = renderHook(() =>
            useProfileContentModel({
                readOnly: true,
                isEditing: false,
                settingsOpen: false,
                customization,
                saveCustomization: vi.fn(async () => true),
                saveProfile: vi.fn(async () => true),
                actions: [{ id: 'a1', type: 'call', label: 'اتصال', value: '07501234567' }],
                phonePublic: '07501234567',
                cityPublic: 'بغداد',
                syndicateIdPublic: '123',
            }),
        );

        expect(result.current.showContactSection).toBe(false);
        expect(result.current.showGallerySection).toBe(false);
        expect(result.current.showCustomBlocks).toBe(false);
        expect(result.current.metaItems).toHaveLength(0);
        expect(result.current.showSyndicate).toBe(false);
    });

    it('أثناء الاستوديو يطبّق خصوصية الزائر على المالك (معاينة حية)', () => {
        const customization = defaultProfilePageCustomization();
        customization.privacy = {
            ...customization.privacy,
            showGallery: false,
            showContactChannels: false,
            showCustomBlocks: false,
        };

        const { result } = renderHook(() =>
            useProfileContentModel({
                readOnly: false,
                isEditing: false,
                settingsOpen: true,
                customization,
                saveCustomization: vi.fn(async () => true),
                saveProfile: vi.fn(async () => true),
                actions: [{ id: 'a1', type: 'call', label: 'اتصال', value: '07501234567' }],
                phonePublic: '07501234567',
                cityPublic: 'بغداد',
                syndicateIdPublic: '123',
            }),
        );

        expect(result.current.showGallerySection).toBe(false);
        expect(result.current.showContactSection).toBe(false);
        expect(result.current.showCustomBlocks).toBe(false);
    });

    it('يحفظ تخصيص المعاينة أثناء التعديل', async () => {
        const saveProfile = vi.fn(async () => true);
        const customization = defaultProfilePageCustomization();

        const { result } = renderHook(() =>
            useProfileContentModel({
                readOnly: false,
                isEditing: true,
                settingsOpen: false,
                customization,
                saveCustomization: vi.fn(async () => true),
                saveProfile,
                actions: [],
                phonePublic: undefined,
                cityPublic: undefined,
                syndicateIdPublic: undefined,
            }),
        );

        await act(async () => {
            result.current.handleSaveEdit();
        });

        expect(saveProfile).toHaveBeenCalled();
    });
});
