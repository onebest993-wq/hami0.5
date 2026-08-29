import type { AppSettingsState, SecuritySettings } from './types';
import {
    BUILTIN_NOTIFICATIONS_ENABLED,
    BUILTIN_PUSH_ENABLED,
    isWithinBuiltInQuietHours,
} from './builtInBehavior';

/** سياسة الدفع — معزولة عن apply.ts حتى لا تسحب ثيم/خلفية اللوحة إلى مسار البلاطات. */
export function shouldAllowPushFromSecurity(security: SecuritySettings): boolean {
    if (security.localOnlyMode) return false;
    return BUILTIN_NOTIFICATIONS_ENABLED && BUILTIN_PUSH_ENABLED && !isWithinBuiltInQuietHours();
}

export function shouldAllowPush(settings: AppSettingsState): boolean {
    return shouldAllowPushFromSecurity(settings.security);
}
