import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useState } from 'react';
import { ProfileGallerySection } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileGallerySection';
import type { EditDraft } from '@/app/components/lawyer/RoyalLawyerProfile/types';
import type { ProfileGalleryItem } from '@/app/services/lawyer-cloud';

const SAMPLE: ProfileGalleryItem = {
    url: 'https://cdn.example/g1.jpg',
    focusX: 50,
    focusY: 50,
    zoom: 1,
    storagePath: 'gallery/g1.jpg',
};

describe('ProfileGallerySection readOnly delete gate', () => {
    it('isEditing+readOnly لا يُظهر حذف البلاطة', () => {
        function Harness() {
            const [draft, setDraft] = useState<EditDraft | null>({
                header: { name: 'احمد', title: '', coverImage: '', profileImage: '' },
                actions: [],
                gallery: [SAMPLE],
            });
            const galleryRef = { current: null as HTMLInputElement | null };
            return (
                <ProfileGallerySection
                    isEditing
                    readOnly
                    draft={draft}
                    setDraft={setDraft}
                    gallery={[SAMPLE]}
                    uploading={null}
                    galleryRef={galleryRef}
                />
            );
        }
        render(<Harness />);
        expect(screen.queryByTestId('lawyer-profile-gallery-upload')).toBeNull();
        expect(screen.queryByLabelText('حذف الصورة')).toBeNull();
        expect(screen.getByTestId('profile-gallery-tile-0')).toBeTruthy();
    });
});
