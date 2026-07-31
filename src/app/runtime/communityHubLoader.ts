import type { ComponentType } from 'react';
import { CommunityScreen, type CommunityScreenProps } from '@/app/components/lawyer/CommunityScreen';

export type CommunityScreenComponent = ComponentType<CommunityScreenProps>;

/** المنتدى متزامن في stem — لا chunk منفصل للفتح */
const cachedCommunityScreen: CommunityScreenComponent = CommunityScreen;

export function isCommunityScreenModuleResolved(): boolean {
    return true;
}

export function getCachedCommunityScreen(): CommunityScreenComponent {
    return cachedCommunityScreen;
}

/** للاختبارات */
export function resetCommunityHubModuleCacheForTests(): void {
    /* noop — وحدة متزامنة */
}

export function loadCommunityScreenModule(): Promise<{ CommunityScreen: CommunityScreenComponent }> {
    return Promise.resolve({ CommunityScreen: cachedCommunityScreen });
}

/** Prefetch — يبقى للتوافق؛ المحتوى أصلاً في stem عند تركيب Host */
export function prefetchCommunityScreenModule(): void {
    if (typeof window === 'undefined') return;
}

export function hydrateCommunityScreenForInstantOpen(): Promise<boolean> {
    return Promise.resolve(true);
}
