import { isAppealOrCassationStageName } from './appealChallengeTruth';
import {
    DIRECT_CASSATION_BLOCKED_MESSAGE,
    isCassationAppealMethod,
    listBlockedDirectCassationPartyIds,
} from '@/app/domain/lawsuit/cassationArt210';

/** تمييز مباشر من البداءة فقط — بعد الاستئناف لا يُستدعى قيد الاعتراض الغيابي. */
export function shouldGateDirectCassationFromSource(
    sourceStageName?: string | null,
    appealType?: string | null,
): boolean {
    if (!isCassationAppealMethod(appealType)) return false;
    return !isAppealOrCassationStageName(sourceStageName);
}

export function resolveDirectCassationBlockMessage(params: {
    sourceStageName?: string | null;
    appealType?: string | null;
    lanes?: unknown;
    partyIds?: Array<number | string> | null;
    today: string;
}): string | null {
    if (!shouldGateDirectCassationFromSource(params.sourceStageName, params.appealType)) {
        return null;
    }
    const blocked = listBlockedDirectCassationPartyIds({
        lanes: params.lanes,
        partyIds: params.partyIds,
        today: params.today,
    });
    return blocked.length > 0 ? DIRECT_CASSATION_BLOCKED_MESSAGE : null;
}
