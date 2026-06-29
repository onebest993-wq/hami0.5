import { prefetchSmartRepositoryModal } from '@/app/utils/lazyComponents';
import { prefetchSmartVaultDocs } from '@/app/services/vault/vaultDocsWarmCache';
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';

/** prefetch فقط — بدون mount (hover/idle) */
export function warmVaultOnHover(): void {
    prefetchRepositoryHubModule();
    prefetchSmartRepositoryModal();
}

/** عند فتح المستودع — prefetch + تهيئة ذاكرة الوثائق */
export function warmVaultOnOpen(userId: string | null | undefined): void {
    warmVaultOnHover();
    prefetchSmartVaultDocs(userId);
}
