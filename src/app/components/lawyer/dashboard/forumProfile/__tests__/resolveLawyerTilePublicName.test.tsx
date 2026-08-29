import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForumTileProfileName } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileName';
import { DEV_UNLOCK_LAWYER_NAME } from '@/app/services/auth/devUnlockSession';
import {
    DEV_UNLOCK_LAWYER_BADGE,
    DEV_UNLOCK_LAWYER_PUBLIC_NAME,
    resolveLawyerTilePublicName,
} from '@/app/components/lawyer/dashboard/forumProfile/resolveLawyerTilePublicName';

describe('resolveLawyerTilePublicName', () => {
    it('يعرض شارة مطور بدل النص الخام مطور حامي', () => {
        expect(resolveLawyerTilePublicName(DEV_UNLOCK_LAWYER_NAME)).toEqual({
            name: DEV_UNLOCK_LAWYER_PUBLIC_NAME,
            badge: DEV_UNLOCK_LAWYER_BADGE,
        });
        render(<ForumTileProfileName displayName={DEV_UNLOCK_LAWYER_NAME} />);
        expect(screen.getByText(DEV_UNLOCK_LAWYER_PUBLIC_NAME)).toBeTruthy();
        expect(screen.getByTestId('home-dev-lawyer-badge')).toHaveTextContent(DEV_UNLOCK_LAWYER_BADGE);
        expect(screen.queryByText(DEV_UNLOCK_LAWYER_NAME)).toBeNull();
    });

    it('يبقي اسم المحامي الحقيقي كما هو', () => {
        expect(resolveLawyerTilePublicName('احمد مهدي')).toEqual({
            name: 'احمد مهدي',
            badge: null,
        });
    });
});
