/** معرّف كيان منتدى — مصدر واحد للواجهة والحارس */
export function createForumEntityId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `forum_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}
