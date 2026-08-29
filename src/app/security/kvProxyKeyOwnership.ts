/**
 * KV key/prefix ownership — مصدر واحد للقواعد (BFF + Edge legacy).
 * PRIVATE: يجب احتواء userId. الملف المهني قراءة عامة؛ المستودع ملك صاحبه.
 */

function parseTwoPartySuffix(
    rawKey: string,
    prefix: string,
): { left: string; right: string } | null {
    if (!rawKey.startsWith(prefix)) return null;
    const rest = rawKey.slice(prefix.length);
    const sep = rest.indexOf(':');
    if (sep <= 0) return null;
    const left = rest.slice(0, sep);
    const right = rest.slice(sep + 1);
    if (!left || !right || right.includes(':')) return null;
    return { left, right };
}

/** follow:<followerId>:<followingId> — لا تُخلط مع followers: */
function parseFollowKvParties(rawKey: string): { follower: string; following: string } | null {
    if (rawKey.startsWith('followers:')) return null;
    const parts = parseTwoPartySuffix(rawKey, 'follow:');
    if (!parts) return null;
    return { follower: parts.left, following: parts.right };
}

/** followers:<followingId>:<followerId> — فهرس عكسي لقائمة المتابِعين */
function parseFollowersIndexParties(rawKey: string): { following: string; follower: string } | null {
    const parts = parseTwoPartySuffix(rawKey, 'followers:');
    if (!parts) return null;
    return { following: parts.left, follower: parts.right };
}

export function isKeyOwnedBy(rawKey: unknown, userId: string, op: 'read' | 'write'): boolean {
    if (typeof rawKey !== 'string' || !rawKey || !userId) return false;
    const k = rawKey;
    const u = userId;

    if (k.startsWith(`user:${u}:`)) return true;
    if (k.startsWith(`calendar:${u}:`)) return true;
    if (k.startsWith(`lawyer_files:${u}:`)) return true;
    if (k.startsWith(`urgentActions:${u}:`)) return true;
    if (k.startsWith(`transactions:${u}:`)) return true;
    if (k.startsWith(`transactionsThreading:${u}:`)) return true;
    if (k.startsWith(`notifications:${u}:`)) return true;
    if (k === `notifications_${u}`) return true;
    if (k.startsWith(`vault:docs:${u}:`)) return true;
    if (k.startsWith(`repository:docs:${u}:`)) return true;
    if (k === `hami:push:${u}`) return true;
    if (k === `hami:calendar:events:${u}:v1`) return true;
    if (k === `profile:${u}`) return true;

    const follow = parseFollowKvParties(k);
    if (follow) {
        if (op === 'write') return follow.follower === u;
        return follow.follower === u || follow.following === u;
    }

    const inbound = parseFollowersIndexParties(k);
    if (inbound) {
        if (op === 'write') return inbound.follower === u;
        return inbound.follower === u || inbound.following === u;
    }

    if (op === 'read') {
        /** ملف مهني — قراءة عامة لأي محامٍ مصادق؛ الكتابة تبقى للمالك فقط */
        if (k.startsWith('profile:')) return true;
    }

    return false;
}

export function isPrefixOwnedBy(
    rawPrefix: unknown,
    userId: string,
    _op: 'read' | 'write',
): boolean {
    if (typeof rawPrefix !== 'string' || !rawPrefix || !userId) return false;
    const p = rawPrefix;
    const u = userId;

    if (p.startsWith(`user:${u}:`)) return true;
    if (p.startsWith(`calendar:${u}:`)) return true;
    if (p.startsWith(`lawyer_files:${u}:`)) return true;
    if (p.startsWith(`urgentActions:${u}:`)) return true;
    if (p.startsWith(`transactions:${u}:`)) return true;
    if (p.startsWith(`transactionsThreading:${u}:`)) return true;
    if (p.startsWith(`notifications:${u}:`)) return true;
    if (p.startsWith(`vault:docs:${u}:`)) return true;
    if (p.startsWith(`repository:docs:${u}:`)) return true;
    /* followers: قبل follow: — `followers:`.startsWith(`follow:`) صحيح نصّاً */
    if (p.startsWith(`followers:${u}:`)) return true;
    if (p.startsWith(`follow:${u}:`)) return true;
    void _op;
    return false;
}
