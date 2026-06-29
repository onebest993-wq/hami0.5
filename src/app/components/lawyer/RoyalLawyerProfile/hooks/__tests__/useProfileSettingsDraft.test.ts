import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProfileSettingsDraft } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/useProfileSettingsDraft';
import { defaultProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';

describe('useProfileSettingsDraft', () => {
    it('يعيد بناء المسودة عند فتح الورقة', () => {
        const customization = {
            ...defaultProfilePageCustomization(),
            accentColor: 'gold' as const,
        };

        const { result, rerender } = renderHook(
            ({ open }: { open: boolean }) => useProfileSettingsDraft(open, customization),
            { initialProps: { open: false } },
        );

        rerender({ open: true });
        expect(result.current.draft.accentColor).toBe('gold');
    });

    it('يُخفي ويُظهر قناة تواصل في المسودة', () => {
        const customization = defaultProfilePageCustomization();
        const onDraftChange = vi.fn();

        const { result, rerender } = renderHook(
            ({ open }: { open: boolean }) => useProfileSettingsDraft(open, customization, onDraftChange),
            { initialProps: { open: false } },
        );

        rerender({ open: true });

        act(() => {
            result.current.toggleContactVisibility('contact-1', false);
        });
        expect(result.current.draft.privacy.hiddenContactIds).toContain('contact-1');

        act(() => {
            result.current.toggleContactVisibility('contact-1', true);
        });
        expect(result.current.draft.privacy.hiddenContactIds).not.toContain('contact-1');
    });

    it('يطبّق patchDraft', () => {
        const customization = defaultProfilePageCustomization();

        const { result, rerender } = renderHook(
            ({ open }: { open: boolean }) => useProfileSettingsDraft(open, customization),
            { initialProps: { open: false } },
        );

        rerender({ open: true });

        act(() => {
            result.current.patchDraft((prev) => ({ ...prev, material: 'metal' }));
        });

        expect(result.current.draft.material).toBe('metal');
    });
});
