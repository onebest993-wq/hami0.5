import type { ComponentType } from 'react';
import { CommunityScreen, type CommunityScreenProps } from '@/app/components/lawyer/CommunityScreen';

export type CommunityScreenComponent = ComponentType<CommunityScreenProps>;

/** المنتدى متزامن في stem — لا chunk منفصل للفتح */
const cachedCommunityScreen: CommunityScreenComponent = CommunityScreen;

/*
 * الأربع أدناه نُقلت إلى `./communityHubReadiness` لأنها لا تحتاج الشاشة، وبقاؤها
 * هنا كان يُلزم كلَّ من يسأل عن الجهوزيّة باستيراد الشاشة ثابتاً — وهو ما أغلق
 * دائرة الستّة على مسار المنتدى. تُعاد من هنا تصديراً فلا يتغيّر مستوردوها.
 */
export {
    hydrateCommunityScreenForInstantOpen,
    isCommunityScreenModuleResolved,
    prefetchCommunityScreenModule,
    resetCommunityHubModuleCacheForTests,
} from '@/app/runtime/communityHubReadiness';

export function getCachedCommunityScreen(): CommunityScreenComponent {
    return cachedCommunityScreen;
}

export function loadCommunityScreenModule(): Promise<{ CommunityScreen: CommunityScreenComponent }> {
    return Promise.resolve({ CommunityScreen: cachedCommunityScreen });
}
