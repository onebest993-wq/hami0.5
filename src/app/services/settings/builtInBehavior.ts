import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { HOME_SECTION_ORDER_DEFAULT, type HomeSectionId } from './homeSections';
import type { ViewMode } from './types';

/** سلوك ثابت — لم يعد جزءاً من lawyer_settings القابل للتعديل.
 *  الإشعارات والتنبيهات تُعرض في الإعدادات كمعلومة فقط (SecuritySection) — لا مفاتيح وهمية في الحالة المحفوظة. */
export const BUILTIN_VIEW_MODE_DEFAULT: ViewMode = 'list';
export const BUILTIN_COMPACT_MODE = false;
export const BUILTIN_WATERMARK_EXPORT = false;
export const BUILTIN_AUTO_SUMMARY = false;
export const BUILTIN_SMART_ALERTS = true;
export const BUILTIN_HOME_SECTION_ORDER: HomeSectionId[] = [...HOME_SECTION_ORDER_DEFAULT];

export const BUILTIN_NOTIFICATIONS_ENABLED = true;
export const BUILTIN_PUSH_ENABLED = true;
export const BUILTIN_NOTIFICATION_SOUND = true;
export const BUILTIN_NOTIFICATION_VIBRATE = true;
export const BUILTIN_QUIET_HOURS = false;
export const BUILTIN_QUIET_HOURS_START = '22:00';
export const BUILTIN_QUIET_HOURS_END = '07:00';

const VIEW_MODE_STORAGE_KEY = 'hami:view-mode';

export function loadPersistedViewMode(): ViewMode {
    const stored = persistenceRepository.load<string>(VIEW_MODE_STORAGE_KEY);
    return stored === 'grid' ? 'grid' : BUILTIN_VIEW_MODE_DEFAULT;
}

export function persistViewMode(mode: ViewMode): void {
    persistenceRepository.save(VIEW_MODE_STORAGE_KEY, mode);
}

export function isWithinBuiltInQuietHours(now = new Date()): boolean {
    if (!BUILTIN_QUIET_HOURS) return false;
    const [sh, sm] = BUILTIN_QUIET_HOURS_START.split(':').map(Number);
    const [eh, em] = BUILTIN_QUIET_HOURS_END.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    if (start <= end) return mins >= start && mins < end;
    return mins >= start || mins < end;
}
