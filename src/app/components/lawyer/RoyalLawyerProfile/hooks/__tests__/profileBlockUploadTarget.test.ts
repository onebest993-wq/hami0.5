import { describe, expect, it } from 'vitest';
import { resolveProfileBlockImageUploadTarget } from '@/app/components/lawyer/RoyalLawyerProfile/hooks/profileBlockUploadFlow';
import type { ProfileCustomBlock } from '@/app/services/profile/profilePageCustomization';

const imageBlock: ProfileCustomBlock = {
    id: 'img-1',
    kind: 'image',
    title: 'صورة',
    shape: 'rounded',
    width: 'half',
    minHeightPx: 120,
};

const textBlock: ProfileCustomBlock = {
    id: 'txt-1',
    kind: 'text',
    title: 'نص حر',
    shape: 'rounded',
    width: 'full',
    minHeightPx: 80,
};

describe('resolveProfileBlockImageUploadTarget', () => {
    it('يفضّل الكتلة المعلّقة من زر الرفع', () => {
        expect(
            resolveProfileBlockImageUploadTarget('img-1', 'txt-1', [imageBlock, textBlock]),
        ).toBe('img-1');
    });

    it('يسقط على الكتلة المفتوحة إن كانت صورة', () => {
        expect(resolveProfileBlockImageUploadTarget(null, 'img-1', [imageBlock, textBlock])).toBe(
            'img-1',
        );
    });

    it('لا يرفع على نص مفتوح بلا تعليق زر', () => {
        expect(resolveProfileBlockImageUploadTarget(null, 'txt-1', [imageBlock, textBlock])).toBeNull();
    });

    it('يتجاهل معلّقاً محذوفاً ثم يسقط على الصورة المفتوحة', () => {
        expect(
            resolveProfileBlockImageUploadTarget('gone', 'img-1', [imageBlock, textBlock]),
        ).toBe('img-1');
    });
});
