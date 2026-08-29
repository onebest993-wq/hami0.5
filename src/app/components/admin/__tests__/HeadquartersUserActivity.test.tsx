import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeadquartersUserActivity } from '@/app/components/admin/HeadquartersUserActivity';
import type { HqAccountActivity } from '@/app/domain/admin/HqAccountActivity';

const activity: HqAccountActivity = {
    createdAt: '2026-01-01T00:00:00.000Z',
    lastSignInAt: '2026-08-01T00:00:00.000Z',
    emailConfirmedAt: null,
    bannedUntil: null,
    sessionCount: 1,
    lastDevice: 'هاتف أندرويد — حامٍ',
    lastIp: '203.0.113.10',
    lastPlace: 'بغداد، العراق',
    connections: [
        {
            at: '2026-08-01T01:00:00.000Z',
            deviceLabel: 'هاتف أندرويد — حامٍ',
            ip: '203.0.113.10',
            place: 'بغداد، العراق',
            source: 'login',
        },
    ],
    forumPosts: 0,
    forumComments: 0,
    forumBanned: false,
    forumBanReason: null,
    forumBanExpiresAt: null,
    timeline: [],
    gaps: [],
};

describe('HeadquartersUserActivity', () => {
    it('يعرض نوع الجهاز والعنوان ومكان الشبكة', () => {
        render(<HeadquartersUserActivity activity={activity} loading={false} error={false} />);
        expect(screen.getByText('نوع الجهاز')).toBeInTheDocument();
        expect(screen.getAllByText('هاتف أندرويد — حامٍ').length).toBeGreaterThan(0);
        expect(screen.getAllByText('203.0.113.10').length).toBeGreaterThan(0);
        expect(screen.getByText('بغداد، العراق')).toBeInTheDocument();
        expect(screen.queryByText(/AppleWebKit/)).not.toBeInTheDocument();
        expect(screen.queryByText(/GPS/i)).not.toBeInTheDocument();
    });
});
