/** دمج معالجات متابعة الملف من cluster + core دون استبدال كامل */
export function mergeAssemblyDossierFollowupHandlers(
    clusterHandlers: Record<string, unknown>,
    coreHandlers: Record<string, unknown>,
): Record<string, unknown> | undefined {
    const cluster = clusterHandlers.dossierFollowupHandlers as Record<string, unknown> | undefined;
    const core = coreHandlers.dossierFollowupHandlers as Record<string, unknown> | undefined;
    if (!cluster && !core) return undefined;
    return { ...(cluster || {}), ...(core || {}) };
}
