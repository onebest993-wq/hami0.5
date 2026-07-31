/**
 * Public surface — مجتمع المحامين / المنتدى.
 */
export {
    loadCommunityScreenModule,
    prefetchCommunityScreenModule,
    getCachedCommunityScreen,
    isCommunityScreenModuleResolved,
} from '@/app/runtime/communityHubLoader';
export type { CommunityScreenComponent } from '@/app/runtime/communityHubLoader';
