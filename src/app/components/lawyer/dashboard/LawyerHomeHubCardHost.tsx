import React, { useLayoutEffect, useState } from 'react';
import type { LawyerHomeHubCardProps } from '@/app/components/lawyer/LawyerHomeHubCard';
import {
    loadLawyerHomeHubCardModule,
    peekLawyerHomeHubCardModule,
    prefetchLawyerHomeHubCardModule,
} from '@/app/runtime/homeHubCardLoader';
import { HomeHubCardShellFallback } from '@/app/components/lawyer/dashboard/HomeHubCardShellFallback';

type HubCardComponent = React.ComponentType<LawyerHomeHubCardProps>;

/**
 * يعرض البطاقة فور حلّ الـ chunk — بلا Suspense waterfall.
 * القشرة تبقى حتى يكتمل التحميل المسبق/الديناميكي.
 */
export function LawyerHomeHubCardHost(props: LawyerHomeHubCardProps) {
    const [Card, setCard] = useState<HubCardComponent | null>(() => {
        const mod = peekLawyerHomeHubCardModule();
        return mod ? mod.LawyerHomeHubCard : null;
    });

    useLayoutEffect(() => {
        prefetchLawyerHomeHubCardModule();
        const mod = peekLawyerHomeHubCardModule();
        if (mod) {
            setCard(() => mod.LawyerHomeHubCard);
            return undefined;
        }
        let cancelled = false;
        void loadLawyerHomeHubCardModule().then((m) => {
            if (cancelled) return;
            setCard(() => m.LawyerHomeHubCard);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    if (!Card) {
        return <HomeHubCardShellFallback />;
    }

    return <Card {...props} />;
}
