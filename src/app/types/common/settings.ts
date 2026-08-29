/**
 * Settings-facing language / font aliases.
 * SettingsState re-export kept for legacy imports.
 */

/** @deprecated Use `AppSettingsState` from `@/app/services/settings` — alias kept for imports. */
export type { AppSettingsState as SettingsState } from '@/app/services/settings/types';

export type Language = 'ar' | 'en';
export type FontSize = 'small' | 'medium' | 'large' | 'xlarge';
