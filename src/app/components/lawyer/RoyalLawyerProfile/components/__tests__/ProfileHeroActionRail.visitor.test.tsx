import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ProfileHeroActionRail } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileHeroActionRail';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('ProfileHeroActionRail — مالك مقابل زائر', () => {
    const noop = () => undefined;

    it('المالك يرى للجميع واستوديو وتعديل', () => {
        render(
            <ProfileHeroActionRail
                readOnly={false}
                showForumSocial={false}
                pageAccess="public"
                onCyclePageAccess={noop}
                onEditClick={noop}
                onEditPointerDown={noop}
                onEditPointerCancel={noop}
                onStudioClick={noop}
                onStudioPointerDown={noop}
                onStudioPointerCancel={noop}
                onStudioWarm={noop}
            />,
        );
        expect(screen.getByTestId('lawyer-profile-page-access')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-settings')).toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-edit')).toBeInTheDocument();
    });

    it('الزائر لا يرى أدوات المالك — متابعة فقط إن وُجدت', () => {
        render(
            <ProfileHeroActionRail
                readOnly
                showForumSocial
                forumFollow={{
                    isFollowing: false,
                    busy: false,
                    onToggle: noop,
                    postCount: 2,
                    followerCount: 1,
                }}
                pageAccess="public"
                onCyclePageAccess={noop}
                onEditClick={noop}
                onEditPointerDown={noop}
                onEditPointerCancel={noop}
                onStudioClick={noop}
                onStudioPointerDown={noop}
                onStudioPointerCancel={noop}
                onStudioWarm={noop}
            />,
        );
        expect(screen.queryByTestId('lawyer-profile-page-access')).not.toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-profile-settings')).not.toBeInTheDocument();
        expect(screen.queryByTestId('lawyer-profile-edit')).not.toBeInTheDocument();
        expect(screen.getByTestId('lawyer-profile-follow')).toBeInTheDocument();
    });
});

describe('مسار ملف المنتدى الشبكي — صدق الربط', () => {
    it('الغطاء يمرّر targetUserId والجذر يفرض readOnly لغير المالك', () => {
        const overlay = readFileSync(
            resolve(
                process.cwd(),
                'src/app/components/lawyer/CommunityScreen/components/ForumMemberProfileOverlay.tsx',
            ),
            'utf8',
        );
        const profileIndex = readFileSync(
            resolve(process.cwd(), 'src/app/components/lawyer/RoyalLawyerProfile/index.tsx'),
            'utf8',
        );
        expect(overlay).toContain('targetUserId={userId}');
        expect(overlay).toContain('forum-member-profile');
        expect(overlay).toContain('role="dialog"');
        expect(overlay).toContain('aria-modal="true"');
        expect(overlay).toContain('useBodyScrollLock(true)');
        expect(profileIndex).toContain('readOnly={!profile.isOwnProfile}');
    });
});
