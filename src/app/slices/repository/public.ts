/**
 * Public surface — المستودع الذكي.
 */
export {
    loadRepositoryHubModule,
    prefetchRepositoryHubModule,
    getCachedSmartRepositoryModal,
    getCachedRepositoryUnifiedFeed,
    isRepositoryHubModuleResolved,
} from '@/app/runtime/repositoryHubLoader';
export type {
    SmartRepositoryModalComponent,
    SmartRepositoryUnifiedFeedComponent,
} from '@/app/runtime/repositoryHubLoader';
