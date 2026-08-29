import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
    ProfileContentBodySections,
    shouldMountProfileCustomBlocks,
} from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContentBodySections';

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileCustomBlocks', () => ({
    ProfileCustomBlocks: () => <div data-testid="profile-custom-blocks" />,
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileGalleryViewer', () => ({
    ProfileGalleryViewer: () => null,
}));

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileContactChannel', () => ({
    ProfileContactChannel: () => null,
}));

const base = {
    isEditing: false,
    readOnly: false,
    draft: null,
    setDraft: vi.fn(),
    actions: [],
    visibleActions: [],
    gallery: [],
    committedGalleryPaths: [] as Array<string | undefined | null>,
    uploading: null as const,
    galleryRef: { current: null },
    screenActive: true,
    pageHidden: false,
    settingsOpen: false,
    customBlocks: [],
    addContactChannel: vi.fn(),
    onBlocksLayoutChange: vi.fn(),
};

describe('ProfileContentBodySections — جسم الملف المعروض للمستخدم', () => {
    it('المالك: قنوات فارغة + معرض فارغ كما في الصفحة المفتوحة', () => {
        render(
            <ProfileContentBodySections
                {...base}
                showContactSection
                showGallerySection
                showCustomBlocks={false}
            />,
        );
        expect(screen.getByText('قنوات التواصل')).toBeTruthy();
        expect(screen.getByText('أضف قنوات التواصل من «تعديل».')).toBeTruthy();
        expect(screen.getByText('المعرض')).toBeTruthy();
        expect(screen.getByText('لا صور بعد')).toBeTruthy();
        expect(screen.queryByTestId('profile-custom-blocks')).toBeNull();
        expect(screen.queryByTestId('lawyer-profile-gallery-upload')).toBeNull();
        expect(document.querySelector('[data-profile-page-body]')).toBeTruthy();
        expect(document.querySelector('[data-profile-blocks-pending]')).toBeNull();
    });

    it('مالك بكتل فارغة وshowCustomBlocks: لا يركّب شجرة الكتل', () => {
        render(
            <ProfileContentBodySections
                {...base}
                showContactSection
                showGallerySection
                showCustomBlocks
            />,
        );
        expect(screen.queryByTestId('profile-custom-blocks')).toBeNull();
        expect(document.querySelector('[data-profile-blocks-pending]')).toBeNull();
        expect(shouldMountProfileCustomBlocks(true, false, 0)).toBe(false);
        expect(shouldMountProfileCustomBlocks(true, false, 1)).toBe(true);
        expect(shouldMountProfileCustomBlocks(true, true, 0)).toBe(true);
        expect(shouldMountProfileCustomBlocks(false, false, 2)).toBe(false);
    });

    it('عند وجود كتل: يركّب الشجرة بعد مقطع الكتل', async () => {
        render(
            <ProfileContentBodySections
                {...base}
                showContactSection
                showGallerySection
                showCustomBlocks
                customBlocks={[
                    {
                        id: 'b1',
                        kind: 'text',
                        title: 'نص',
                        shape: 'rounded',
                        width: 'full',
                        minHeightPx: 80,
                        order: 0,
                    },
                ]}
            />,
        );
        await waitFor(() => {
            expect(screen.getByTestId('profile-custom-blocks')).toBeTruthy();
        });
    });

    it('إخفاء القسمين عند الخصوصية لا يترك نصاً فارغاً مضلّلاً', () => {
        render(
            <ProfileContentBodySections
                {...base}
                showContactSection={false}
                showGallerySection={false}
                showCustomBlocks={false}
            />,
        );
        expect(screen.queryByText('قنوات التواصل')).toBeNull();
        expect(screen.queryByText('لا صور بعد')).toBeNull();
        expect(screen.queryByText('أضف قنوات التواصل من «تعديل».')).toBeNull();
    });
});
