const MAX_KNOWN_IDS = 400;
const knownIdsByUser = new Map<string, Set<string>>();

export function knownPopupIdsForUser(userId: string): Set<string> {
    const key = userId.trim();
    let known = knownIdsByUser.get(key);
    if (!known) {
        known = new Set();
        knownIdsByUser.set(key, known);
    }
    return known;
}

export function rememberPopupNotificationId(known: Set<string>, id: string): void {
    known.add(id);
    if (known.size <= MAX_KNOWN_IDS) return;
    const trimmed = [...known].slice(-MAX_KNOWN_IDS);
    known.clear();
    for (const entry of trimmed) known.add(entry);
}

export function resetIncomingNotificationPopupMemoryForTests(): void {
    knownIdsByUser.clear();
}
