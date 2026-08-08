import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import {
    resolveAlertsMinHeight,
} from '@/app/services/settings/resolveHomeBlockStyle';
import type { HomeBlockSize } from '@/app/services/settings/homeLayout';

export type HomeHubCardLayoutMode = 'feed' | 'pins';

export type HomeHubCardLayout = {
    /** feed = تنبيهات/سكرتير بارتفاع مخصص للمحتوى الغني؛ pins = متكيّف مع الصفوف */
    mode: HomeHubCardLayoutMode;
    activePanel: HomeHubPanel;
    sectionMinHeightClass: string;
    bodyRegionClass: string;
};

/**
 * نموذج تخطيط بطاقة Hub — مصدر واحد لارتفاع القسم وسلوك التمرير.
 * يمنع تضارب min-h ثابت للتنبيهات مع تبويب التثبيت الفارغ/القصير.
 */
export function resolveHomeHubCardLayout(input: {
    activePanel: HomeHubPanel;
    pinCount: number;
    blockSize?: HomeBlockSize;
}): HomeHubCardLayout {
    const blockSize = input.blockSize ?? 'normal';

    if (input.activePanel === 'pins') {
        return {
            mode: 'pins',
            activePanel: 'pins',
            sectionMinHeightClass: 'min-h-0',
            bodyRegionClass: 'hami-hub-card-body--pins',
        };
    }

    const feedMinHeight = resolveAlertsMinHeight(blockSize);
    return {
        mode: 'feed',
        activePanel: input.activePanel,
        sectionMinHeightClass: feedMinHeight,
        bodyRegionClass: 'hami-hub-card-body--feed',
    };
}
