import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ProfileGallerySection } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileGallerySection';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';

vi.mock('@/app/components/lawyer/RoyalLawyerProfile/components/ProfileGalleryViewer', () => ({
    ProfileGalleryViewer: ({ open }: { open: boolean }) =>
        open ? <div data-testid="profile-gallery-viewer" /> : null,
}));

const SAMPLE: ProfileGalleryItem = {
    url: 'https://cdn.example/g1.jpg',
    focusX: 50,
    focusY: 50,
    zoom: 1,
    storagePath: 'gallery/g1.jpg',
};

function GalleryHarness({
    isEditing,
    readOnly = false,
    initialGallery = [] as ProfileGalleryItem[],
    uploading = null as 'avatar' | 'gallery' | null,
    screenActive = true,
}: {
    isEditing: boolean;
    readOnly?: boolean;
    initialGallery?: ProfileGalleryItem[];
    uploading?: 'avatar' | 'gallery' | null;
    screenActive?: boolean;
}) {
    const [draft, setDraft] = useState<EditDraft | null>(
        isEditing
            ? {
                  header: {
                      name: 'احمد',
                      title: '',
                      coverImage: '',
                      profileImage: '',
                  },
                  actions: [],
                  gallery: initialGallery,
              }
            : null,
    );
    const galleryRef = { current: null as HTMLInputElement | null };
    const gallery = isEditing && draft ? draft.gallery : initialGallery;
    return (
        <ProfileGallerySection
            isEditing={isEditing}
            readOnly={readOnly}
            draft={draft}
            setDraft={setDraft}
            gallery={gallery}
            uploading={uploading}
            galleryRef={galleryRef}
            screenActive={screenActive}
        />
    );
}

describe('ProfileGallerySection', () => {
    it('المالك خارج التعديل: فارغ بلا زر رفع', () => {
        render(<GalleryHarness isEditing={false} />);
        expect(screen.getByText('لا صور بعد')).toBeTruthy();
        expect(screen.getByTestId('lawyer-profile-gallery')).toHaveAttribute('data-empty', 'true');
        expect(screen.getByRole('heading', { name: 'المعرض' })).toBeTruthy();
        expect(screen.queryByTestId('lawyer-profile-gallery-upload')).toBeNull();
    });

    it('أثناء التعديل: زر رفع 44px وتعطيل أثناء الرفع', () => {
        const { rerender } = render(<GalleryHarness isEditing />);
        const upload = screen.getByTestId('lawyer-profile-gallery-upload');
        expect(upload).toHaveTextContent('رفع');
        expect(upload.className).toMatch(/min-h-\[44px\]/);
        expect(screen.getByText('لا صور بعد')).toBeTruthy();
        rerender(<GalleryHarness isEditing uploading="gallery" />);
        expect(screen.getByTestId('lawyer-profile-gallery-upload')).toBeDisabled();
        expect(screen.getByTestId('lawyer-profile-gallery-upload')).toHaveTextContent(
            'جاري الرفع...',
        );
    });

    it('الزائر لا يرى زر الرفع حتى مع صور', () => {
        render(<GalleryHarness isEditing={false} readOnly initialGallery={[SAMPLE]} />);
        expect(screen.queryByTestId('lawyer-profile-gallery-upload')).toBeNull();
        expect(screen.getByTestId('profile-gallery-tile-0')).toBeTruthy();
        expect(screen.getByTestId('lawyer-profile-gallery')).toHaveAttribute('data-empty', 'false');
        expect(screen.queryByLabelText('حذف الصورة')).toBeNull();
    });

    it('يفتح المعاينة من البلاطة ويحذف أثناء التعديل', async () => {
        render(<GalleryHarness isEditing initialGallery={[SAMPLE]} />);
        fireEvent.click(screen.getByTestId('profile-gallery-tile-0'));
        expect(await screen.findByTestId('profile-gallery-viewer')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('حذف الصورة'));
        expect(screen.getByText('لا صور بعد')).toBeTruthy();
        expect(screen.queryByTestId('profile-gallery-viewer')).toBeNull();
    });

    it('يغلق المعاين عند إخفاء الشاشة', async () => {
        const { rerender } = render(<GalleryHarness isEditing initialGallery={[SAMPLE]} />);
        fireEvent.click(screen.getByTestId('profile-gallery-tile-0'));
        expect(await screen.findByTestId('profile-gallery-viewer')).toBeTruthy();
        rerender(<GalleryHarness isEditing initialGallery={[SAMPLE]} screenActive={false} />);
        expect(screen.queryByTestId('profile-gallery-viewer')).toBeNull();
    });
});
