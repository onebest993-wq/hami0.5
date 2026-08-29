import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    QuestionCardHeaderAvatar,
    QuestionCardHeaderIdentity,
} from '@/app/components/lawyer/CommunityScreen/components/QuestionCardHeaderIdentity';
import {
    resetPublicVerifiedBadgeStoreForTests,
    writePublicVerifiedBadge,
} from '@/app/services/auth/publicVerifiedBadgeStore';

describe('QuestionCardHeaderIdentity', () => {
    afterEach(() => {
        resetPublicVerifiedBadgeStoreForTests();
    });

    it('يرسم صورة المؤلف غير المجهول دون ReferenceError', () => {
        expect(() => render(<QuestionCardHeaderAvatar isAnonymous={false} />)).not.toThrow();
        expect(() => render(<QuestionCardHeaderAvatar isAnonymous />)).not.toThrow();
    });

    it('يعرض علامة التوثيق على صورة المؤلف بعد قرار المقر', () => {
        writePublicVerifiedBadge('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee', true);
        render(
            <QuestionCardHeaderAvatar
                isAnonymous={false}
                authorId="aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
            />,
        );
        expect(screen.getByTestId('accredited-lawyer-mark')).toBeInTheDocument();
    });

    it('يفتح ملف المؤلف من الاسم الظاهر', () => {
        const onOpenAuthor = vi.fn();
        render(
            <QuestionCardHeaderIdentity
                displayName="محامٍ زائر اختبار"
                isAnonymous={false}
                canFollow={false}
                isFollowing={false}
                onOpenAuthor={onOpenAuthor}
                onFollow={vi.fn()}
            />,
        );
        screen.getByTestId('forum-open-author-profile').click();
        expect(onOpenAuthor).toHaveBeenCalledTimes(1);
    });
});
