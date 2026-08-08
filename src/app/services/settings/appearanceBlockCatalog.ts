import type { HomeCustomizableId } from './homeLayout';
import { HOME_BLOCK_LABELS } from './homeBlockLabels';

/** أقسام وبطاقات الواجهة الرئيسية القابلة للتخصيص من الإعدادات */
export const APPEARANCE_BLOCK_SCOPE_IDS = [
    'alerts',
    'hubExecution',
    'hubLawsuit',
    'hubTransaction',
    'forum',
    'dockRepository',
    'dockCalendar',
    'dockTasks',
    'dockQuickNote',
] as const satisfies readonly HomeCustomizableId[];

export type AppearanceBlockScopeId = (typeof APPEARANCE_BLOCK_SCOPE_IDS)[number];

export function appearanceBlockLabel(id: AppearanceBlockScopeId): string {
    return HOME_BLOCK_LABELS[id] ?? id;
}
