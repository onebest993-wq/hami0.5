import { useCallback, useState } from 'react';
import { prefetchCriminalDashboardTab } from './criminalDashboardLazyRegistry';
import { type CriminalDashboardTab } from './criminalDashboardTabChrome';

/** حالة تبويب الإضبارة + تبديل فوري مع prefetch للسطح الكسول. */
export function useCriminalDashboardTabSwitch() {
    const [activeTab, setActiveTab] = useState<CriminalDashboardTab>('requests');
    // مزامنة فورية — startTransition كان يؤجّل التمييز فيبدو أن التبويب «لا يعمل»
    const switchDashboardTab = useCallback((tab: CriminalDashboardTab) => {
        setActiveTab(tab);
        prefetchCriminalDashboardTab(tab);
    }, []);
    const statementsTabActive = activeTab === 'statements';
    const requestsTabActive = activeTab === 'requests';

    return {
        activeTab,
        setActiveTab,
        switchDashboardTab,
        statementsTabActive,
        requestsTabActive,
    };
}
