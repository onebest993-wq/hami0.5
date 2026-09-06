/**
 * ثوابت الأحداث المركزية — Single Source of Truth لجميع أحداث CustomEvent
 * (hami:* و hami-*) في التطبيق.
 *
 * لا تُعرّف أي ثابت حدث بنفس القيمة في أي مكان آخر — استورد من هنا دائماً.
 *
 * تم إنشاؤه كجزء من Task 1 في Perfect Production From Scratch لإزالة التكرار
 * الميداني المكتشف لـ APP_RUNTIME_READY_EVENT (4 مرات في 4 ملفات مختلفة).
 */

/**
 * يُطلَق عند اكتمال تحميل وقت تشغيل التطبيق وجاهزية الشجرة التفاعلية
 * (وليس بالضرورة جاهزية البيانات — انظر BOOT_REVEAL_DONE_EVENT لذلك).
 *
 * المستمعون الأصل: boot/mountApplication, hq/mountHqApplication.
 * المرسِلون الأصل: app/AppResolvedRuntime, hq/HqResolvedRuntime.
 */
export const APP_RUNTIME_READY_EVENT = 'hami:app-runtime-ready';

/* === أحداث مرحلة الإقلاع (Boot Phases) === */

export const BOOT_CONTENT_READY_EVENT = 'hami:boot-content-ready';
export const BOOT_REVEAL_DONE_EVENT = 'hami:boot-reveal-done';
export const DASHBOARD_SHELL_PAINTED_EVENT = 'hami:dashboard-shell-painted';
export const HOME_MAIN_GRID_PAINTED_EVENT = 'hami:home-main-grid-painted';
export const HOME_STATIC_SHELL_PAINTED_EVENT = 'hami:home-static-shell-painted';
export const DASHBOARD_INTERACTIVE_EVENT = 'hami:dashboard-interactive';
export const FIRST_TAB_OPEN_EVENT = 'hami:first-tab-open';
export const STAGGERED_BOOT_IDLE_EVENT = 'hami:staggered-boot-idle';

/* === أحداث أصولية / Native Bridge === */

export const NATIVE_CAPACITOR_BOOT_DONE_EVENT = 'hami:capacitor-native-ready';
export const NATIVE_BOOT_READY_FAILED_EVENT = 'hami:native-boot-ready-failed';
export const HAMI_NATIVE_APP_STATE_EVENT = 'hami-native-app-state';
export const HAMI_APP_STATE_EVENT = HAMI_NATIVE_APP_STATE_EVENT;
export const HAMI_BFF_SESSION_LOST_EVENT = 'hami:bff-session-lost';

/* === أحداث الجلسة والمصادقة === */

export const HAMI_AUTH_LOGOUT_EVENT = 'hami:auth-logout';
export const HAMI_REQUEST_AUTH_GATE_EVENT = 'hami:request-auth-gate';

/* === أحداث التراكب (Overlays) والواجهة === */

export const HAMI_DISMISS_TRANSIENT_OVERLAYS_EVENT = 'hami:dismiss-transient-overlays';
export const HAMI_DISMISS_OVERLAYS_EVENT = HAMI_DISMISS_TRANSIENT_OVERLAYS_EVENT;
export const HAMI_OPEN_FORUM_EVENT = 'hami:open-forum';
export const HOME_HUB_ENTRY_OPEN_EVENT = 'hami:home-hub-entry-open';
export const HOME_HUB_RADAR_DISMISSED_EVENT = 'hami:home-hub-radar-dismissed';

/* === أحداث Shells الترطيب الفوري (Instant Paint Hydrators) === */

export const NOTIFICATION_SHELL_HYDRATED_EVENT = 'hami:notification-shell-hydrated';
export const NOTIFICATION_PRIME_HOST_EVENT = 'hami:notification-prime-host';
export const REPOSITORY_PRIME_HOST_EVENT = 'hami:repository-prime-host';
export const REPOSITORY_INSTANT_DISMISS_EVENT = 'hami:repository-instant-dismiss';
export const PROFILE_PROMOTE_SHELL_EVENT = 'hami:profile-promote-shell';
export const GLOBAL_SEARCH_SHELL_HYDRATED_EVENT = 'hami:global-search-shell-hydrated';
export const GLOBAL_SEARCH_INSTANT_DISMISS_EVENT = 'hami-gs-instant-dismiss';
export const GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT = 'hami:global-search-overlay-interactive';
export const CRIMINAL_CHROME_HYDRATED_EVENT = 'hami:criminal-chrome-hydrated';
export const EXECUTION_CHROME_HYDRATED_EVENT = 'hami:execution-chrome-hydrated';
export const EXECUTION_ARCHIVE_PRIME_HOST_EVENT = 'hami:prime-execution-archive-host';
export const EXECUTION_DOSSIER_PRIME_HOST_EVENT = 'hami:execution-dossier-prime-host';
export const COMMUNITY_SHELL_HYDRATED_EVENT = 'hami:community-shell-hydrated';
export const FIELD_TASKS_INSTANT_DISMISS_EVENT = 'hami:field-tasks-instant-dismiss';
export const FIELD_TASKS_INSTANT_COMPLETE_EVENT = 'hami:field-tasks-instant-complete';
export const FIELD_TASKS_INSTANT_MANAGE_EVENT = 'hami:field-tasks-instant-manage';
export const LAWSUITS_PRIME_HOST_EVENT = 'hami:lawsuits-prime-host';
export const LAWSUITS_STORAGE_WARMED_EVENT = 'hami:lawsuits-storage-warmed';
export const CRIMINAL_DASHBOARD_BRIDGE_ACTIVATE_EVENT = 'hami:criminal-dashboard-bridge-activate';
export const CALENDAR_REQUEST_SYNC_EVENT = 'hami:calendar-request-sync';
export const CALENDAR_BACKGROUND_SYNC_FAILED_EVENT = 'hami:calendar-background-sync-failed';
export const CALENDAR_UPDATED_EVENT = 'hami:calendar-updated';
export const CALENDAR_SOURCE_PATCHED_EVENT = 'hami:calendar-source-patched';
export const HAMI_CALENDAR_NATIVE_SYNC_EVENT = 'hami:calendar-native-sync';
export const URGENT_ACTIONS_CHANGED_EVENT = 'hami:urgent-actions-changed';
export const CASE_SHARE_CHANGED_EVENT = 'hami:case-share-changed';

/* === أحداث التخزين المؤقت للقوانين === */

export const HAMI_LAWS_CATALOG_CHANGED_EVENT = 'hami-laws-catalog-changed';
export const CIVIL_LAW_CACHE_INVALIDATED_EVENT = 'hami-civil-law-cache-invalidated';

/* === معرفات أحداث التقويم الدائمة (القيم النصية الثابتة لـ bridgeId) === */

/** معرف الجسر لزيارة التنفيذ التالية (يُستخدم كـ sourceEventId ثابت). */
export const EXECUTION_VISIT_NEXT_EVENT_ID = 'visit_next';

export const CALENDAR_EVENTS_STORAGE_KEY = 'hami:calendar:events:v1';
export const LOCAL_DEBUG_EVENT_STORAGE_KEY = 'hami:enable-local-debug-events';
