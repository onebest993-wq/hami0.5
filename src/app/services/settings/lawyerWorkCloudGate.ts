/**
 * مزامنة العمل — ليست منتدى ولا ملف مهني.
 * الدعاوى/التنفيذ/التقويم/المعاملات/المخزن/المستودع تبقى محلية
 * حتى يُفعَّل cloudSync في الإعدادات والبيئة تسمح.
 */
import { isCloudSyncEnabled } from '@/lib/cloudSyncEnv.js';
import { getLawyerSettingsSnapshot } from './settingsSnapshot';
import type { AppSettingsState } from './types';

const USER_PROFILE_KV_RE = /^user:[^:]+:profile(?::|$)/;

export function isLawyerWorkCloudLive(settings?: AppSettingsState): boolean {
    const snap = settings ?? getLawyerSettingsSnapshot();
    if (snap.security.localOnlyMode) return false;
    if (!snap.data.cloudSync) return false;
    return isCloudSyncEnabled();
}

/** مفاتيح KV التي تخص أقسام العمل المحلية — ليست profile/follow/notifications */
export function isWorkLocalKvMaterial(keyOrPrefix: string): boolean {
    const k = keyOrPrefix.trim();
    if (!k) return false;
    if (k.startsWith('calendar:') || k.startsWith('hami:calendar:events:')) return true;
    if (k.startsWith('transactions:') || k.startsWith('transactionsThreading:')) return true;
    if (k.startsWith('vault:docs:') || k.startsWith('repository:docs:')) return true;
    if (k.startsWith('lawyer_files:') || k.startsWith('urgentActions:')) return true;
    if (k.startsWith('user:')) {
        if (USER_PROFILE_KV_RE.test(k)) return false;
        return true;
    }
    return false;
}
