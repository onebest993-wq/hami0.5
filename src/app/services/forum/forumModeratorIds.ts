function getConfiguredAdminUuid(): string {
    const env = typeof process !== 'undefined' ? process.env : undefined;
    const configured = (env?.ADMIN_UUID ?? '').trim();
    if (configured) return configured;
    if ((env?.NODE_ENV ?? '').toLowerCase() !== 'production') return 'admin-uuid-1';
    return '';
}

/** معرّفات المشرفين/الأدمن لإشعارات البلاغات (سيرفر) */
export async function listForumModeratorUserIds(): Promise<string[]> {
    const ids = new Set<string>();
    const adminUuid = getConfiguredAdminUuid();
    if (adminUuid) ids.add(adminUuid);

    if (typeof window !== 'undefined') return [...ids];

    try {
        const { loadForumSupabaseAdmin } = await import('./loadForumSupabaseAdmin');
        const admin = await loadForumSupabaseAdmin();
        if (admin) {
            const { data } = await admin.from('profiles').select('id').in('role', ['admin', 'moderator']);
            for (const row of data ?? []) {
                const id = String((row as { id: string }).id ?? '').trim();
                if (id) ids.add(id);
            }
        }
    } catch {
        /* server admin optional */
    }
    return [...ids];
}
