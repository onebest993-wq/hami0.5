const DRAFT_PREFIX = 'hami:sovereign-quick-note-draft:';
const MAX_DRAFT_CHARS = 2_000;

function draftKey(userId: string): string {
    return `${DRAFT_PREFIX}${userId.trim()}`;
}

function useTestDraftStore(): boolean {
    return import.meta.env.MODE === 'test' || import.meta.env.VITEST === true;
}

function getTestDraftMap(): Map<string, string> {
    const g = globalThis as unknown as { __HAMI_QUICK_NOTE_DRAFTS?: Map<string, string> };
    if (!g.__HAMI_QUICK_NOTE_DRAFTS) g.__HAMI_QUICK_NOTE_DRAFTS = new Map();
    return g.__HAMI_QUICK_NOTE_DRAFTS;
}

export async function loadQuickNoteDraft(userId?: string): Promise<string> {
    if (!userId?.trim()) return '';
    const key = draftKey(userId);
    if (useTestDraftStore()) {
        return getTestDraftMap().get(key) ?? '';
    }
    if (typeof window === 'undefined') return '';
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.ensurePersistedReady();
        const raw = await SecureStoreService.getItem(key);
        if (!raw) return '';
        return raw.length > MAX_DRAFT_CHARS ? raw.slice(0, MAX_DRAFT_CHARS) : raw;
    } catch {
        return '';
    }
}

export async function saveQuickNoteDraft(userId: string | undefined, text: string): Promise<void> {
    if (!userId?.trim()) return;
    const key = draftKey(userId);
    const trimmed = text.slice(0, MAX_DRAFT_CHARS);
    if (useTestDraftStore()) {
        if (trimmed) getTestDraftMap().set(key, trimmed);
        else getTestDraftMap().delete(key);
        return;
    }
    if (typeof window === 'undefined') return;
    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.ensurePersistedReady();
        if (trimmed) await SecureStoreService.setItem(key, trimmed);
        else await SecureStoreService.deleteItem(key);
    } catch {
        /* silent */
    }
}

export async function clearQuickNoteDraft(userId?: string): Promise<void> {
    await saveQuickNoteDraft(userId, '');
}
