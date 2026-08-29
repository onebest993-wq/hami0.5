import type { HqConnectionFact } from '@/app/domain/admin/hqConnectionSignal';

export type HqAccountTimelineItem = {
    at: string;
    kind: string;
    label: string;
    detail: string | null;
};

export type HqAccountActivity = {
    createdAt: string | null;
    lastSignInAt: string | null;
    emailConfirmedAt: string | null;
    bannedUntil: string | null;
    sessionCount: number | null;
    lastDevice: string | null;
    lastIp: string | null;
    lastPlace: string | null;
    connections: HqConnectionFact[];
    forumPosts: number | null;
    forumComments: number | null;
    forumBanned: boolean | null;
    forumBanReason: string | null;
    forumBanExpiresAt: string | null;
    timeline: HqAccountTimelineItem[];
    gaps: string[];
};
