import { peekBootSessionPeekSync } from '@/boot/peekBootSessionUserId';
import { resolveForumTileProfileChrome } from '@/app/services/profile/resolveForumTileProfileChrome';

/** كروم أول طلاء — نفس مصدر البلاطة الحية */
export function peekForumFirstPaintChrome() {
    const session = peekBootSessionPeekSync();
    return resolveForumTileProfileChrome(session?.userId, session?.userMetadata ?? undefined);
}
