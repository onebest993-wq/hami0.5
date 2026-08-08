import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

export type HomeWidgetStageDelay = {
    minDelayMs: number;
    timeoutMs: number;
};

export type HomeWidgetStageDelays = {
    overlays: HomeWidgetStageDelay;
    forumSignals: HomeWidgetStageDelay;
    secondary: HomeWidgetStageDelay;
    forum: HomeWidgetStageDelay;
    dockWarm: HomeWidgetStageDelay;
};

const WEB_HOME_STAGE_DELAYS: HomeWidgetStageDelays = {
    overlays: { minDelayMs: 0, timeoutMs: 1_000 },
    forumSignals: { minDelayMs: 0, timeoutMs: 900 },
    secondary: { minDelayMs: 0, timeoutMs: 800 },
    forum: { minDelayMs: 0, timeoutMs: 900 },
    dockWarm: { minDelayMs: 80, timeoutMs: 2_500 },
};

/** على الأصلي: البلاطات تُرسم مع أول إطار — التأخير كان يسبب فراغات وشكل أسود للمنتدى */
const NATIVE_HOME_STAGE_DELAYS: HomeWidgetStageDelays = {
    overlays: { minDelayMs: 220, timeoutMs: 1_200 },
    forumSignals: { minDelayMs: 160, timeoutMs: 900 },
    secondary: { minDelayMs: 0, timeoutMs: 0 },
    forum: { minDelayMs: 0, timeoutMs: 0 },
    dockWarm: { minDelayMs: 80, timeoutMs: 2_500 },
};

export function resolveHomeWidgetStageDelays(): HomeWidgetStageDelays {
    return isCapacitorNativePlatform() ? NATIVE_HOME_STAGE_DELAYS : WEB_HOME_STAGE_DELAYS;
}

export function shouldPaintHomeHubTilesImmediately(): boolean {
    return true;
}
