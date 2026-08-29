import type { HomeHubPanel } from '@/app/services/alerts/homeHubCardLogic';
import {
    resolveAlertsMinHeight,
} from '@/app/services/settings/resolveHomeBlockStyle';
import type { HomeBlockSize } from '@/app/services/settings/homeLayout';

type HomeHubCardLayoutMode = 'feed' | 'pins';

export type HomeHubCardLayout = {
    /** feed = تنبيهات/سكرتير بارتفاع مخصص للمحتوى الغني؛ pins = متكيّف مع الصفوف */
    mode: HomeHubCardLayoutMode;
    activePanel: HomeHubPanel;
    sectionMinHeightClass: string;
    bodyRegionClass: string;
};

/**
 * أثناء الإقلاع: إذا ظهرت عناصر نثبّت الحالة ولا نرجع للفارغ حتى يستقر العدّ.
 * بعد الاستقرار: نتبع القيمة الحيّة (إخفاء المحتوى يُقلّص البطاقة).
 */
export function resolveStableHubHasItems(
    liveHasItems: boolean,
    bootSettling: boolean,
    latch: { current: boolean },
): boolean {
    if (liveHasItems) latch.current = true;
    if (!bootSettling) {
        latch.current = liveHasItems;
        return liveHasItems;
    }
    return latch.current;
}

/**
 * نموذج تخطيط بطاقة Hub — مصدر واحد لارتفاع القسم وسلوك التمرير.
 * يمنع تضارب min-h ثابت للتنبيهات مع تبويب التثبيت الفارغ/القصير.
 */
export function resolveHomeHubCardLayout(input: {
    activePanel: HomeHubPanel;
    pinCount: number;
    blockSize?: HomeBlockSize;
    /** false = فارغة: ارتفاع المحتوى فقط. true/undefined = feed بحد أدنى للمحتوى الغني */
    hasFeedContent?: boolean;
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

    if (input.hasFeedContent === false) {
        return {
            mode: 'feed',
            activePanel: input.activePanel,
            sectionMinHeightClass: 'min-h-0',
            bodyRegionClass: 'hami-hub-card-body--feed',
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
