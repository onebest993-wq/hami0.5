import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import {
    COMMUNITY_FORUM_POLL_MS_DEFAULT,
    COMMUNITY_FORUM_POLL_MS_LITE,
} from './communityScreenConstants';

export function resolveCommunityForumPollMs(): number {
    return isLitePerformanceActive() ? COMMUNITY_FORUM_POLL_MS_LITE : COMMUNITY_FORUM_POLL_MS_DEFAULT;
}

export function resolveForumUnreadPollMs(streamRunning: boolean): number {
    const base = streamRunning ? 45_000 : 12_000;
    return isLitePerformanceActive() ? base * 2 : base;
}

export function resolveForumStreamHealthCheckMs(): number {
    return isLitePerformanceActive() ? 60_000 : 30_000;
}
