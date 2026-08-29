import { SETTINGS_INSTANT_BRIDGE_ID } from '@/app/runtime/settingsInstantPaintConstants';
import type { HubLayerMotionSpec } from '@/app/runtime/overlayHubLayerMotion';
import { TASKS_MANAGER_INSTANT_CHROME_ID } from '@/app/services/fieldTasks/fieldTasksShellSnap';

export const FORUM_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-forum-open',
    closingAttr: 'data-hami-forum-closing',
    enterAttr: 'data-hami-forum-enter',
    layerSelector: '[data-testid="forum-overlay-host"]',
};

export const REPOSITORY_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-repository-open',
    closingAttr: 'data-hami-repository-closing',
    enterAttr: 'data-hami-repository-enter',
    layerSelector: '[data-testid="smart-repository-modal"]',
};

export const TASKS_MANAGER_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-tasks-manager-open',
    closingAttr: 'data-hami-tasks-manager-closing',
    enterAttr: 'data-hami-tasks-manager-enter',
    layerSelector: '[data-testid="tasks-manager-overlay"]',
    chromeId: TASKS_MANAGER_INSTANT_CHROME_ID,
};

export const SCHEDULE_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-schedule-open',
    closingAttr: 'data-hami-schedule-closing',
    enterAttr: 'data-hami-schedule-enter',
    layerSelector: '[data-testid="lawyer-dashboard-schedule-surface"]',
};

export const SETTINGS_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-settings-open',
    closingAttr: 'data-hami-settings-closing',
    enterAttr: 'data-hami-settings-enter',
    layerSelector: '[data-testid="hami-settings-overlay-host"]',
    chromeId: SETTINGS_INSTANT_BRIDGE_ID,
};

export const FIELD_TASKS_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-field-tasks-open',
    closingAttr: 'data-hami-field-tasks-closing',
    enterAttr: 'data-hami-field-tasks-enter',
    layerSelector: '[data-testid="field-tasks-sheet"]',
    exitMs: 160,
};

export const LAWSUITS_HUB_LAYER: HubLayerMotionSpec = {
    openAttr: 'data-hami-lawsuits-open',
    closingAttr: 'data-hami-lawsuits-closing',
    enterAttr: 'data-hami-lawsuits-enter',
    layerSelector: '[data-testid="lawsuits-workspace"]',
};
