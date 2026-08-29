import { render, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CommunityPost } from '@/app/services/lawyer-cloud';
import { QuestionCardAttachment } from '@/app/components/lawyer/CommunityScreen/components/QuestionCardAttachment';

function buildPost(overrides: Partial<CommunityPost> = {}): CommunityPost {
    return {
        id: 'post-1',
        authorId: 'lawyer-1',
        authorName: 'محامٍ تجريبي',
        content: 'منشور اختبار',
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachment: null,
        upvoterIds: [],
        comments: [],
        bestCommentId: null,
        isAnonymous: false,
        ...overrides,
    };
}

describe('QuestionCardAttachment', () => {
    it('يفتح معاينة VaultDocViewer محلياً عند النقر على الصورة', () => {
        render(
            <QuestionCardAttachment
                post={buildPost({
                    attachment: {
                        type: 'image',
                        name: 'dragon-wallpaper.jpg',
                        mimeType: 'image/jpeg',
                        url: 'blob:mock-image',
                        storagePath: 'forum/a.jpg',
                    },
                })}
                attachmentUrl="blob:mock-image"
                attachmentLoading={false}
            />,
        );

        fireEvent.click(screen.getByRole('button'));

        expect(screen.getByTestId('vault-doc-viewer-overlay')).toBeTruthy();
    });

    it('يتجاهل attachment الفارغ دون رمي خطأ', () => {
        const { container } = render(
            <QuestionCardAttachment
                post={buildPost({ attachment: null })}
                attachmentUrl={null}
                attachmentLoading={false}
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('لا يرسم إطار صورة فارغ أثناء التحميل (مصدر الخطوط البيضاء)', () => {
        const { container } = render(
            <QuestionCardAttachment
                post={buildPost({
                    attachment: {
                        type: 'image',
                        name: 'shot.jpg',
                        mimeType: 'image/jpeg',
                        url: '',
                        storagePath: 'forum/a.jpg',
                    },
                })}
                attachmentUrl={null}
                attachmentLoading
            />,
        );

        expect(container.firstChild).toBeNull();
    });

    it('يستدعي onMediaReady عند غياب المرفق', () => {
        const onMediaReady = vi.fn();
        render(
            <QuestionCardAttachment
                post={buildPost({ attachment: null })}
                attachmentUrl={null}
                attachmentLoading={false}
                onMediaReady={onMediaReady}
            />,
        );
        expect(onMediaReady).toHaveBeenCalled();
    });
});
