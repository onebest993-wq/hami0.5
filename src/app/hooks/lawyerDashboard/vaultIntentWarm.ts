function loadRepositoryHubLoader() {
    return import('@/app/runtime/repositoryHubLoader');
}

function prefetchSmartRepositoryModalIntent(): void {
    void import('@/app/utils/lazyComponentsIntent')
        .then((m) => m.prefetchSmartRepositoryModal())
        .catch(() => undefined);
}

/** prefetch فقط — بدون mount (hover/idle) */
export function warmVaultOnHover(): void {
    void loadRepositoryHubLoader().then((m) => m.prefetchRepositoryHubModule());
    prefetchSmartRepositoryModalIntent();
}

/** عند فتح المستودع — prefetch + تهيئة ذاكرة الوثائق */
export function warmVaultOnOpen(userId: string | null | undefined): void {
    warmVaultOnHover();
    void import('@/app/services/vault/vaultDocsWarmCache')
        .then((m) => m.prefetchSmartVaultDocs(userId))
        .catch(() => undefined);
}
