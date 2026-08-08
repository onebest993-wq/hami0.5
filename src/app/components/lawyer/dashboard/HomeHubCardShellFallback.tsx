import type { CSSProperties } from 'react';
import { HOME_HUB_ALERTS_EMPTY_COPY } from '@/app/services/alerts/homeHubCardLogic';
import {
    resolveAlertsMinHeight,
    resolveHomeBlockClassNames,
} from '@/app/services/settings/resolveHomeBlockStyle';
import { HubPanelTabs } from '@/app/components/lawyer/LawyerHomeHubCard/components/HubPanelTabs';

const noop = () => undefined;

/** قشرة تحميل بنفس ارتفاع/هيكل البطاقة النهائية — بلا قفزة بصرية */
export function HomeHubCardShellFallback() {
    const blockClasses = resolveHomeBlockClassNames();
    const blockStyle: CSSProperties = {
        padding: `calc(1rem * var(--hami-content-scale, 1))`,
    };

    return (
        <section
            className={`relative flex flex-col border ${blockClasses} ${resolveAlertsMinHeight('normal')} min-h-0 gap-3`}
            style={blockStyle}
            dir="rtl"
            aria-label="البطاقة الذكية"
            aria-busy="true"
            data-testid="home-hub-card-skeleton"
        >
            <HubPanelTabs
                hubPanel="alerts"
                onChange={noop}
                alertsCount={0}
                pinsCount={0}
                reduceMotion
            />
            <p className="text-[10px] text-white/35 flex-1 flex items-center py-6" role="status">
                {HOME_HUB_ALERTS_EMPTY_COPY.loading}
            </p>
        </section>
    );
}